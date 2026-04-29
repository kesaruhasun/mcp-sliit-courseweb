import { chromium, type Browser, type Page, type BrowserContext } from 'playwright';
import dotenv from 'dotenv';
import * as fs from 'fs';
import * as path from 'path';
import * as crypto from 'crypto';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.resolve(__dirname, '../.env') });

export interface Course {
    id: string;
    name: string;
    url: string;
}

export interface Announcement {
    title: string;
    date: string;
    author: string;
    link: string;
}

export class CoursewebClient {
    private browser: Browser | null = null;
    private context: BrowserContext | null = null;

    async init() {
        this.browser = await chromium.launch({
            headless: process.env.HEADLESS !== 'false',
        });
        
        const sessionPath = path.resolve(__dirname, '../storage_state.json');
        
        try {
            this.context = await this.browser.newContext({
                storageState: sessionPath
            });
        } catch (e) {
            this.context = await this.browser.newContext();
        }
    }

    async interactiveLogin() {
        // Force a visible browser specifically for interactive login
        const interactiveBrowser = await chromium.launch({ headless: false });
        const loginContext = await interactiveBrowser.newContext();
        const page = await loginContext.newPage();
        
        console.error("Opening browser for interactive login...");
        await page.goto('https://courseweb.sliit.lk/login/index.php');
        
        try {
            await page.waitForURL('**/my/**', { timeout: 120000 });
            console.error("Login successful! Saving session...");
            const sessionPath = path.resolve(__dirname, '../storage_state.json');
            await loginContext.storageState({ path: sessionPath });
            return `Login successful! Session saved to ${sessionPath}. All other tools will now run in the background (headless).`;
        } catch (error) {
            return "Login timed out or failed. Please try again.";
        } finally {
            await loginContext.close();
            await interactiveBrowser.close();
            
            // If the main client browser was running, we re-initialize it to pick up the new cookie
            if (this.browser) {
                await this.browser.close();
                await this.init();
            }
        }
    }

    async login() {
        if (!this.context) throw new Error('Client not initialized');
        const page = await this.context.newPage();
        
        await page.goto('https://courseweb.sliit.lk/my/');

        if (page.url().includes('/my/')) {
            await page.close();
            return true;
        }

        await page.goto('https://courseweb.sliit.lk/login/index.php');
        
        const loginButton = page.locator('.login-identityprovider-btn');
        if (await loginButton.count() > 0) {
            await loginButton.click();
            await page.waitForSelector('input[type="email"]');
            await page.fill('input[type="email"]', process.env.SLIIT_USERNAME + '@my.sliit.lk');
            await page.click('input[type="submit"]');
        } else {
            await page.fill('#username', process.env.SLIIT_USERNAME || '');
            await page.fill('#password', process.env.SLIIT_PASSWORD || '');
            await page.click('#loginbtn');
        }

        try {
            await page.waitForURL('**/my/**', { timeout: 30000 });
            const sessionPath = path.resolve(__dirname, '../storage_state.json');
            await this.context.storageState({ path: sessionPath });
            await page.close();
            return true;
        } catch (e) {
            await page.close();
            throw new Error("Session expired and auto-login failed. Please run the 'interactive_login' tool to refresh your MFA session.");
        }
    }

    async getEnrolledCourses(): Promise<Course[]> {
        if (!this.context) throw new Error('Client not initialized');
        const page = await this.context.newPage();
        await page.goto('https://courseweb.sliit.lk/my/courses.php', { waitUntil: 'networkidle' });

        try {
            await page.waitForSelector('.course-info-container, .coursename', { timeout: 10000 });
            const courses = await page.evaluate(() => {
                const items = document.querySelectorAll('.course-info-container, .coursename');
                return Array.from(items).map(item => {
                    const anchor = item.querySelector('a') as HTMLAnchorElement;
                    if (!anchor) return null;
                    const url = new URL(anchor.href);
                    return {
                        id: url.searchParams.get('id') || '',
                        name: anchor.innerText.trim(),
                        url: anchor.href
                    };
                }).filter(c => c !== null);
            });
            await page.close();
            return courses;
        } catch (e) {
            await page.close();
            throw new Error("Could not find the course list on /my/courses.php. Use the 'scrape_page' tool to investigate the layout.");
        }
    }

    async scrapePage(url: string): Promise<string> {
        if (!this.context) throw new Error('Client not initialized');
        const page = await this.context.newPage();
        await page.goto(url, { waitUntil: 'networkidle' });
        
        const data = await page.evaluate(() => {
            const scripts = document.querySelectorAll('script, style, svg');
            scripts.forEach(s => s.remove());
            return document.body.innerText; 
        });
        
        await page.close();
        return data;
    }

    async getSiteAnnouncements(): Promise<Announcement[]> {
        if (!this.context) throw new Error('Client not initialized');
        const page = await this.context.newPage();
        await page.goto('https://courseweb.sliit.lk/mod/forum/view.php?id=1'); 

        const announcements = await page.evaluate(() => {
            const rows = document.querySelectorAll('tr.discussion');
            return Array.from(rows).map(row => {
                const topic = row.querySelector('.topic a') as HTMLAnchorElement;
                const author = row.querySelector('.author')?.textContent?.trim() || '';
                const date = row.querySelector('.lastpost')?.textContent?.trim() || '';
                return {
                    title: topic.innerText.trim(),
                    link: topic.href,
                    author,
                    date
                };
            });
        });

        await page.close();
        return announcements;
    }

    async getModuleContent(courseId: string) {
        if (!this.context) throw new Error('Client not initialized');
        const page = await this.context.newPage();
        await page.goto(`https://courseweb.sliit.lk/course/view.php?id=${courseId}`);

        const sections = await page.evaluate(() => {
            // Moodle 4.x uses .section elements for weeks/topics
            const sectionElements = document.querySelectorAll('.section');
            return Array.from(sectionElements).map(section => {
                const title = section.querySelector('h3.sectionname, .section-title')?.textContent?.trim() || 'General';
                
                // Activities are usually inside .activity-wrapper
                const activityElements = section.querySelectorAll('.activity-wrapper');
                const activities = Array.from(activityElements).map(act => {
                    const anchor = act.querySelector('a.aalink') as HTMLAnchorElement;
                    if (!anchor) return null;
                    
                    // Determine type based on class
                    let type: 'file' | 'assignment' | 'quiz' | 'other' = 'other';
                    if (act.classList.contains('resource')) type = 'file';
                    else if (act.classList.contains('assign')) type = 'assignment';
                    else if (act.classList.contains('quiz')) type = 'quiz';
                    
                    return {
                        name: anchor.innerText.trim().replace(/\s+File$/, '').replace(/\s+Assignment$/, ''),
                        url: anchor.href,
                        type
                    };
                }).filter(a => a !== null);
                
                return { title, activities };
            }).filter(s => s.activities.length > 0);
        });

        await page.close();
        return sections;
    }

    async getDeadlines() {
        if (!this.context) throw new Error('Client not initialized');
        const page = await this.context.newPage();
        await page.goto('https://courseweb.sliit.lk/calendar/view.php?view=upcoming');

        const events = await page.evaluate(() => {
            const eventCards = document.querySelectorAll('.event');
            return Array.from(eventCards).map(card => {
                const title = card.querySelector('.name')?.textContent?.trim() || '';
                const date = card.querySelector('.description')?.textContent?.trim() || '';
                const course = card.querySelector('.course')?.textContent?.trim() || '';
                return { title, date, course };
            });
        });

        await page.close();
        return events;
    }

    async downloadFile(url: string, outputDirectory: string = './downloads'): Promise<string> {
        if (!this.context) throw new Error('Client not initialized');
        const page = await this.context.newPage();
        
        if (!fs.existsSync(outputDirectory)){
            fs.mkdirSync(outputDirectory, { recursive: true });
        }
        
        try {
            const downloadPromise = page.waitForEvent('download', { timeout: 15000 });
            await page.goto(url, { waitUntil: 'domcontentloaded' });
            
            const forceDownloadLink = await page.$('a[href*="forcedownload=1"], .resourceworkaround a');
            if (forceDownloadLink) {
                await forceDownloadLink.click();
            }
            
            const download = await downloadPromise;
            const suggestedName = download.suggestedFilename();
            const finalPath = path.resolve(outputDirectory, suggestedName);
            const tempPath = path.resolve(outputDirectory, `.temp_${suggestedName}`);
            
            // Download to a temporary file first
            await download.saveAs(tempPath);
            
            // If the file already exists, check if it was updated
            if (fs.existsSync(finalPath)) {
                const existingHash = crypto.createHash('md5').update(fs.readFileSync(finalPath)).digest('hex');
                const newHash = crypto.createHash('md5').update(fs.readFileSync(tempPath)).digest('hex');
                
                if (existingHash === newHash) {
                    fs.unlinkSync(tempPath); // Delete the temp file, it's identical
                    await page.close();
                    return `File already exists and is up-to-date: ${finalPath}`;
                }
            }
            
            // If it's new or updated, replace the old one
            fs.renameSync(tempPath, finalPath);
            await page.close();
            return `Downloaded new or updated file: ${finalPath}`;
            
        } catch (e: any) {
            await page.close();
            throw new Error(`Failed to download from ${url}. It might be a regular page and not a direct file link. Error: ${e.message}`);
        }
    }

    async syncModule(courseId: string, outputDirectory: string = './downloads'): Promise<string[]> {
        const sections = await this.getModuleContent(courseId);
        const results: string[] = [];
        
        for (const section of sections) {
            for (const activity of section.activities) {
                if (activity.type === 'file' && activity.url) {
                    try {
                        const result = await this.downloadFile(activity.url, outputDirectory);
                        results.push(`[${section.title}] ${activity.name}: ${result}`);
                    } catch (e: any) {
                        results.push(`[${section.title}] ${activity.name}: Failed - ${e.message}`);
                    }
                }
            }
        }
        return results;
    }

    async checkAssignmentStatus(url: string) {
        if (!this.context) throw new Error('Client not initialized');
        const page = await this.context.newPage();
        await page.goto(url, { waitUntil: 'networkidle' });

        const status = await page.evaluate(() => {
            const table = document.querySelector('.generaltable');
            if (!table) return null;
            
            const result: Record<string, string> = {};
            const rows = table.querySelectorAll('tr');
            rows.forEach(row => {
                const key = row.querySelector('th')?.textContent?.trim() || '';
                const value = row.querySelector('td')?.textContent?.trim() || '';
                if (key) {
                    result[key] = value;
                }
            });
            
            // Also try to grab the assignment title and description
            const title = document.querySelector('h2')?.textContent?.trim() || '';
            const description = document.querySelector('#intro')?.textContent?.trim() || '';
            
            return { title, description, status: result };
        });

        await page.close();
        return status || { error: "No submission status table found on this page." };
    }

    async close() {
        if (this.browser) await this.browser.close();
    }
}
