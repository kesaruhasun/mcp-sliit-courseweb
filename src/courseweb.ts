import { chromium, type Browser, type Page, type BrowserContext } from 'playwright';
import dotenv from 'dotenv';
import * as fs from 'fs';
import * as path from 'path';
import * as crypto from 'crypto';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.resolve(__dirname, '../.env'), quiet: true });

export interface Course {
    id: string;
    name: string;
    url: string;
    shortname?: string;
    isStarred?: boolean;
    category?: string;
    startDate?: number;
    endDate?: number;
}

export interface Announcement {
    title: string;
    date: string;
    author: string;
    link: string;
}

export interface Activity {
    id?: string;
    name: string;
    url?: string;
    type: 'file' | 'folder' | 'assignment' | 'quiz' | 'url' | 'feedback' | 'forum' | 'page' | 'other';
    files?: Array<{ name: string; url: string }>;
    externalUrl?: string;
    meetingUrl?: string;
    videoUrl?: string;
    description?: string;
}

export interface Section {
    id?: string;
    number?: number;
    title: string;
    activities: Activity[];
}

export function sanitizeFilename(name: string): string {
    return name
        .replace(/[\\/:*?"<>|\r\n\t]/g, '_')
        .replace(/\s+/g, ' ')
        .trim()
        .slice(0, 180);
}

export function extractEmbeddedLinks(textOrHtml: string): { videoUrl?: string; meetingUrl?: string; externalUrl?: string } {
    const result: { videoUrl?: string; meetingUrl?: string; externalUrl?: string } = {};
    if (!textOrHtml) return result;

    const unistreamMatch = textOrHtml.match(/https?:\/\/unistream\.sliit\.lk\/[^\s"'<>]+/i);
    if (unistreamMatch) result.videoUrl = unistreamMatch[0];

    const teamsMatch = textOrHtml.match(/https?:\/\/teams\.microsoft\.com\/[^\s"'<>]+/i);
    if (teamsMatch) result.meetingUrl = teamsMatch[0];

    const zoomMatch = textOrHtml.match(/https?:\/\/[a-z0-9.-]*zoom\.us\/[^\s"'<>]+/i);
    if (zoomMatch) result.meetingUrl = zoomMatch[0];

    const extMatch = textOrHtml.match(/https?:\/\/(?!courseweb\.sliit\.lk)[^\s"'<>]+/i);
    if (extMatch && extMatch[0] !== result.videoUrl && extMatch[0] !== result.meetingUrl) {
        result.externalUrl = extMatch[0];
    }

    return result;
}

export class CoursewebClient {
    private browser: Browser | null = null;
    private context: BrowserContext | null = null;

    private getLaunchOptions(headless: boolean = true) {
        const options: any = { headless };
        if (process.env.CHROME_PATH) {
            options.executablePath = process.env.CHROME_PATH;
        } else if (fs.existsSync('/usr/bin/google-chrome')) {
            options.executablePath = '/usr/bin/google-chrome';
        } else if (fs.existsSync('/usr/bin/google-chrome-stable')) {
            options.executablePath = '/usr/bin/google-chrome-stable';
        } else if (fs.existsSync('/usr/bin/chromium-browser')) {
            options.executablePath = '/usr/bin/chromium-browser';
        } else {
            options.channel = 'chrome';
        }
        return options;
    }

    async init() {
        this.browser = await chromium.launch(this.getLaunchOptions(process.env.HEADLESS !== 'false'));
        
        const sessionPath = path.resolve(__dirname, '../storage_state.json');
        
        try {
            this.context = await this.browser.newContext({
                storageState: sessionPath
            });
        } catch (e) {
            this.context = await this.browser.newContext();
        }
    }

    async setSessionCookie(cookieValue: string) {
        if (!this.browser) await this.init();
        const tempContext = await this.browser!.newContext();
        
        await tempContext.addCookies([{
            name: 'MoodleSession',
            value: cookieValue,
            domain: 'courseweb.sliit.lk',
            path: '/',
            httpOnly: false,
            secure: true,
            sameSite: 'None'
        }]);
        
        const sessionPath = path.resolve(__dirname, '../storage_state.json');
        await tempContext.storageState({ path: sessionPath });
        await tempContext.close();

        // Also update parent directory storage state if it exists
        const rootSessionPath = '/home/dulith/mcp-sliit-courseweb/storage_state.json';
        try {
            if (fs.existsSync('/home/dulith/mcp-sliit-courseweb')) {
                fs.copyFileSync(sessionPath, rootSessionPath);
            }
        } catch {}
        
        if (this.context) {
            await this.context.close();
            await this.init();
        }
        
        return `Successfully injected MoodleSession cookie and saved state to ${sessionPath}`;
    }

    async interactiveLogin(): Promise<string> {
        const sessionPath = path.resolve(__dirname, '../storage_state.json');

        const interactiveBrowser = await chromium.launch(this.getLaunchOptions(false));
        const contextOptions = fs.existsSync(sessionPath) ? { storageState: sessionPath } : {};
        const loginContext = await interactiveBrowser.newContext(contextOptions);
        const page = await loginContext.newPage();
        
        console.error("Opening browser for interactive login...");

        if (fs.existsSync(sessionPath)) {
            try {
                await page.goto('https://courseweb.sliit.lk/my/', { timeout: 10000, waitUntil: 'domcontentloaded' });
                if (page.url().includes('/my/')) {
                    console.error("Session already active and valid.");
                    await loginContext.close().catch(() => {});
                    await interactiveBrowser.close().catch(() => {});
                    return `Session is already active and valid! All tools can run headlessly.`;
                }
            } catch {}
        }

        await page.goto('https://courseweb.sliit.lk/login/index.php');

        (async () => {
            try {
                const ssoButton = page.locator('.login-identityprovider-btn');
                if (await ssoButton.isVisible({ timeout: 5000 }).catch(() => false)) {
                    await ssoButton.click().catch(() => {});
                }

                if (process.env.SLIIT_USERNAME) {
                    const emailInput = page.locator('input[type="email"], #i0116');
                    if (await emailInput.isVisible({ timeout: 8000 }).catch(() => false)) {
                        const username = process.env.SLIIT_USERNAME.includes('@')
                            ? process.env.SLIIT_USERNAME
                            : `${process.env.SLIIT_USERNAME}@my.sliit.lk`;
                        await emailInput.fill(username);
                        await page.locator('input[type="submit"], #idSIButton9').click().catch(() => {});
                    }
                }

                if (process.env.SLIIT_PASSWORD) {
                    const passInput = page.locator('input[type="password"], #i0118');
                    if (await passInput.isVisible({ timeout: 8000 }).catch(() => false)) {
                        await passInput.fill(process.env.SLIIT_PASSWORD);
                        await page.locator('input[type="submit"], #idSIButton9').click().catch(() => {});
                    }
                }
            } catch {}
        })();

        const kmsiInterval = setInterval(async () => {
            try {
                if (page.isClosed()) {
                    clearInterval(kmsiInterval);
                    return;
                }
                const staySignedInBtn = page.locator('input[type="submit"][value="Yes"], #idSIButton9');
                if (await staySignedInBtn.isVisible({ timeout: 500 }).catch(() => false)) {
                    await staySignedInBtn.click().catch(() => {});
                }
            } catch {}
        }, 1000);

        let completed = false;
        const cleanupAndSave = async () => {
            if (completed) return;
            completed = true;
            clearInterval(kmsiInterval);
            console.error("Login successful! Saving session...");
            await loginContext.storageState({ path: sessionPath });
            await loginContext.close().catch(() => {});
            await interactiveBrowser.close().catch(() => {});
            
            if (this.browser) {
                await this.browser.close().catch(() => {});
                await this.init().catch(() => {});
            }
        };

        const loginPromise = page.waitForURL('**/my/**', { timeout: 180000 })
            .then(async () => {
                await cleanupAndSave();
                return `Login successful! Session saved to ${sessionPath}. All other tools will now run in the background (headless).`;
            })
            .catch(async () => {
                clearInterval(kmsiInterval);
                if (!completed) {
                    completed = true;
                    await loginContext.close().catch(() => {});
                    await interactiveBrowser.close().catch(() => {});
                }
                return "Login timed out or was closed. Please try again.";
            });

        const clientSafetyTimeout = new Promise<string>((resolve) => {
            setTimeout(() => {
                if (!completed) {
                    resolve(`Interactive login is in progress in your browser window. Please complete MFA/verification there. Once you reach the dashboard, your session will be saved automatically.`);
                }
            }, 45000);
        });

        return await Promise.race([loginPromise, clientSafetyTimeout]);
    }

    async login() {
        if (!this.context) throw new Error('Client not initialized');
        
        try {
            const pageRes = await this.context.request.get('https://courseweb.sliit.lk/my/', { timeout: 15000 });
            if (pageRes.status() === 200 && pageRes.url().includes('/my/')) {
                return true;
            }
        } catch {}

        const page = await this.context.newPage();
        try {
            await page.goto('https://courseweb.sliit.lk/my/', { waitUntil: 'domcontentloaded', timeout: 15000 });
            if (page.url().includes('/my/')) {
                await page.close();
                return true;
            }

            await page.goto('https://courseweb.sliit.lk/login/index.php');
            const loginButton = page.locator('.login-identityprovider-btn');
            if (await loginButton.count() > 0) {
                await loginButton.click();
                await page.waitForSelector('input[type="email"]');
                const username = process.env.SLIIT_USERNAME?.includes('@')
                    ? process.env.SLIIT_USERNAME
                    : `${process.env.SLIIT_USERNAME}@my.sliit.lk`;
                await page.fill('input[type="email"]', username);
                await page.click('input[type="submit"]');

                if (process.env.SLIIT_PASSWORD) {
                    try {
                        await page.waitForSelector('input[type="password"]', { timeout: 8000 });
                        await page.fill('input[type="password"]', process.env.SLIIT_PASSWORD);
                        await page.click('input[type="submit"]');

                        const staySignedInBtn = page.locator('input[type="submit"][value="Yes"], #idSIButton9');
                        if (await staySignedInBtn.isVisible({ timeout: 5000 }).catch(() => false)) {
                            await staySignedInBtn.click();
                        }
                    } catch {}
                }
            } else {
                await page.fill('#username', process.env.SLIIT_USERNAME || '');
                await page.fill('#password', process.env.SLIIT_PASSWORD || '');
                await page.click('#loginbtn');
            }

            await page.waitForURL('**/my/**', { timeout: 30000 });
            const sessionPath = path.resolve(__dirname, '../storage_state.json');
            await this.context.storageState({ path: sessionPath });
            await page.close();
            return true;
        } catch (e) {
            await page.close().catch(() => {});
            throw new Error("Session expired and auto-login failed. Please run 'set_session_cookie' or 'interactive_login'.");
        }
    }

    async getEnrolledCourses(classification: 'all' | 'favourites' | 'starred' | 'inprogress' | 'past' | 'future' = 'all'): Promise<Course[]> {
        if (!this.context) throw new Error('Client not initialized');
        const filter = (classification === 'starred' ? 'favourites' : classification);

        // Method 1: Fast direct authenticated Moodle Web Service RPC
        try {
            const pageRes = await this.context.request.get('https://courseweb.sliit.lk/my/', { timeout: 15000 });
            const html = await pageRes.text();
            const sesskey = html.match(/"sesskey":"([^"]+)"/)?.[1];
            
            if (sesskey) {
                const rpcRes = await this.context.request.post(`https://courseweb.sliit.lk/lib/ajax/service.php?sesskey=${sesskey}&info=core_course_get_enrolled_courses_by_timeline_classification`, {
                    data: JSON.stringify([{
                        index: 0,
                        methodname: "core_course_get_enrolled_courses_by_timeline_classification",
                        args: {
                            classification: filter,
                            limit: 0,
                            offset: 0,
                            sort: "fullname"
                        }
                    }]),
                    timeout: 15000
                });

                if (rpcRes.status() === 200) {
                    const rpcJson = await rpcRes.json();
                    const coursesData = rpcJson[0]?.data?.courses;
                    if (Array.isArray(coursesData)) {
                        return coursesData.map((c: any) => ({
                            id: String(c.id),
                            name: c.fullname ? c.fullname.replace(/&amp;/g, '&') : '',
                            url: c.viewurl || `https://courseweb.sliit.lk/course/view.php?id=${c.id}`,
                            shortname: c.shortname,
                            isStarred: Boolean(c.isfavourite),
                            category: c.coursecategory,
                            startDate: c.startdate,
                            endDate: c.enddate
                        }));
                    }
                }
            }
        } catch (e) {}

        // Method 2: Headless page DOM fallback
        const page = await this.context.newPage();
        try {
            await page.goto('https://courseweb.sliit.lk/my/courses.php', { waitUntil: 'domcontentloaded', timeout: 30000 });
            await page.waitForTimeout(2000);
            const courses = await page.evaluate(() => {
                const items = document.querySelectorAll('.course-info-container, .coursename, .dashboard-card, [data-region="course-content"] .card');
                const list: Array<Course> = [];
                const seenIds = new Set<string>();

                items.forEach(item => {
                    const anchor = item.querySelector('a') as HTMLAnchorElement;
                    if (!anchor || !anchor.href) return;
                    try {
                        const url = new URL(anchor.href);
                        const id = url.searchParams.get('id') || '';
                        const rawName = anchor.innerText.trim();
                        const lines = rawName.split('\n')
                            .map(l => l.trim())
                            .filter(l => l && !l.startsWith('Course is starred') && !l.startsWith('Course name') && !l.startsWith('Select course'));
                        const name = lines[0] || rawName;
                        const isStarred = item.querySelector('[data-action="unstar"], .fa-star, [aria-label*="starred"]') !== null;
                        if (id && name && !seenIds.has(id)) {
                            seenIds.add(id);
                            list.push({ id, name, url: anchor.href, isStarred });
                        }
                    } catch {}
                });
                return list;
            });
            await page.close();
            if (filter === 'favourites') {
                return courses.filter(c => c.isStarred);
            }
            return courses;
        } catch (e) {
            await page.close();
            throw new Error("Could not find the course list on /my/courses.php. Use 'scrape_page' tool to investigate the layout.");
        }
    }

    async scrapePage(url: string): Promise<string> {
        if (!this.context) throw new Error('Client not initialized');
        const page = await this.context.newPage();
        await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 30000 });
        
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
        await page.goto('https://courseweb.sliit.lk/mod/forum/view.php?id=1', { waitUntil: 'domcontentloaded', timeout: 30000 }); 

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

    async getFolderContents(folderUrl: string): Promise<Array<{ name: string; url: string }>> {
        if (!this.context) throw new Error('Client not initialized');
        try {
            const res = await this.context.request.get(folderUrl, { timeout: 15000 });
            const html = await res.text();
            const fileRegex = /href=[\"']([^\"']*pluginfile\.php\/[^\"]*\/mod_folder\/content\/[^\"]*)[\"'][^>]*>([\s\S]*?)<\/a>/gi;
            const files: Array<{ name: string; url: string }> = [];
            const seen = new Set<string>();

            for (const m of html.matchAll(fileRegex)) {
                if (!m || !m[1]) continue;
                let fileUrl = m[1].replace(/&amp;/g, '&');
                let rawName = (m[2] || '').replace(/<[^>]+>/g, '').trim();
                if (!rawName) {
                    try {
                        const cleanUrl = fileUrl.split('?')[0] || '';
                        rawName = decodeURIComponent(path.basename(new URL(cleanUrl).pathname));
                    } catch {
                        rawName = `file_${files.length + 1}`;
                    }
                }
                if (!seen.has(fileUrl)) {
                    seen.add(fileUrl);
                    files.push({ name: rawName, url: fileUrl });
                }
            }
            return files;
        } catch (e: any) {
            return [];
        }
    }

    async getModuleContent(courseId: string): Promise<Section[]> {
        if (!this.context) throw new Error('Client not initialized');
        
        // Method 1: Moodle Reactive State API (supports format_tiles, format_topics, format_weeks, etc.)
        try {
            const pageRes = await this.context.request.get(`https://courseweb.sliit.lk/course/view.php?id=${courseId}`, { timeout: 20000 });
            const html = await pageRes.text();
            const sesskey = html.match(/"sesskey":"([^"]+)"/)?.[1];
            const contextid = html.match(/"contextid":(\d+)/)?.[1];

            if (sesskey) {
                const stateRes = await this.context.request.post(`https://courseweb.sliit.lk/lib/ajax/service.php?sesskey=${sesskey}&info=core_courseformat_get_state`, {
                    data: JSON.stringify([{
                        index: 0,
                        methodname: "core_courseformat_get_state",
                        args: { courseid: Number(courseId) }
                    }]),
                    timeout: 20000
                });

                if (stateRes.status() === 200) {
                    const stateJson = await stateRes.json();
                    let courseState = stateJson[0]?.data;
                    if (typeof courseState === 'string') {
                        courseState = JSON.parse(courseState);
                    }

                    if (courseState && Array.isArray(courseState.section) && Array.isArray(courseState.cm)) {
                        const cmMap = new Map<string, any>();
                        courseState.cm.forEach((c: any) => cmMap.set(String(c.id), c));

                        const sections: Section[] = [];

                        for (const s of courseState.section) {
                            const rawTitle = s.title || (s.section === 0 ? 'General' : `Topic ${s.section}`);
                            const title = rawTitle.replace(/&amp;/g, '&').replace(/<[^>]+>/g, '').trim();
                            const activities: Activity[] = [];

                            if (Array.isArray(s.cmlist)) {
                                for (const cmId of s.cmlist) {
                                    const cm = cmMap.get(String(cmId));
                                    if (!cm) continue;

                                    let type: Activity['type'] = 'other';
                                    if (cm.module === 'resource') type = 'file';
                                    else if (cm.module === 'folder') type = 'folder';
                                    else if (cm.module === 'assign') type = 'assignment';
                                    else if (cm.module === 'quiz') type = 'quiz';
                                    else if (cm.module === 'url') type = 'url';
                                    else if (cm.module === 'feedback') type = 'feedback';
                                    else if (cm.module === 'forum') type = 'forum';
                                    else if (cm.module === 'page') type = 'page';

                                    const actName = (cm.name || 'Activity')
                                        .replace(/&amp;/g, '&')
                                        .replace(/<[^>]+>/g, '')
                                        .trim()
                                        .replace(/\s+File$/, '')
                                        .replace(/\s+Assignment$/, '');

                                    const actUrl = cm.url || `https://courseweb.sliit.lk/mod/${cm.module}/view.php?id=${cm.id}`;

                                    const actObj: Activity = {
                                        id: String(cm.id),
                                        name: actName,
                                        url: actUrl,
                                        type
                                    };

                                    if (type === 'folder') {
                                        actObj.files = await this.getFolderContents(actUrl);
                                    }

                                    activities.push(actObj);
                                }
                            }

                            // If format_tiles is used, fetch fragment to capture embedded video/meeting links
                            if (html.includes('format-tiles') && contextid && s.id) {
                                try {
                                    const fragRes = await this.context.request.post(`https://courseweb.sliit.lk/lib/ajax/service.php?sesskey=${sesskey}&info=core_get_fragment`, {
                                        data: JSON.stringify([{
                                            index: 0,
                                            methodname: "core_get_fragment",
                                            args: {
                                                component: "format_tiles",
                                                callback: "get_cm_list",
                                                contextid: Number(contextid),
                                                args: [{ name: "sectionid", value: Number(s.id) }]
                                            }
                                        }]),
                                        timeout: 10000
                                    });

                                    if (fragRes.status() === 200) {
                                        const fragJson = await fragRes.json();
                                        const fragHtml = fragJson[0]?.data?.html || '';
                                        if (fragHtml) {
                                            const links = extractEmbeddedLinks(fragHtml);
                                            if (links.videoUrl || links.meetingUrl || links.externalUrl) {
                                                // Attach to the first activity or as a dedicated item
                                                activities.forEach(act => {
                                                    if (links.videoUrl && (act.name.toLowerCase().includes('lecture') || act.name.toLowerCase().includes('slide'))) {
                                                        act.videoUrl = links.videoUrl;
                                                    }
                                                    if (links.meetingUrl && (act.name.toLowerCase().includes('tutorial') || act.name.toLowerCase().includes('tute') || act.name.toLowerCase().includes('meeting'))) {
                                                        act.meetingUrl = links.meetingUrl;
                                                    }
                                                });
                                            }
                                        }
                                    }
                                } catch {}
                            }

                            if (activities.length > 0) {
                                sections.push({
                                    id: String(s.id),
                                    number: s.section,
                                    title,
                                    activities
                                });
                            }
                        }

                        if (sections.length > 0) {
                            return sections;
                        }
                    }
                }
            }
        } catch (e) {}

        // Method 2: Headless Page DOM parsing fallback
        const page = await this.context.newPage();
        try {
            await page.goto(`https://courseweb.sliit.lk/course/view.php?id=${courseId}`, { waitUntil: 'domcontentloaded', timeout: 30000 });

            const sections = await page.evaluate(() => {
                const sectionElements = document.querySelectorAll('.section, [id^="section-"]');
                return Array.from(sectionElements).map(section => {
                    const title = section.querySelector('h3.sectionname, .section-title, .sectiontitle h2')?.textContent?.trim() || 'General';
                    const activityElements = section.querySelectorAll('.activity-wrapper, .activity');
                    const activities: any[] = [];

                    activityElements.forEach(act => {
                        const anchor = act.querySelector('a.aalink, a') as HTMLAnchorElement;
                        if (!anchor || !anchor.href) return;
                        
                        let type: Activity['type'] = 'other';
                        if (act.classList.contains('resource') || anchor.href.includes('/mod/resource/')) type = 'file';
                        else if (act.classList.contains('folder') || anchor.href.includes('/mod/folder/')) type = 'folder';
                        else if (act.classList.contains('assign') || anchor.href.includes('/mod/assign/')) type = 'assignment';
                        else if (act.classList.contains('quiz') || anchor.href.includes('/mod/quiz/')) type = 'quiz';
                        else if (act.classList.contains('url') || anchor.href.includes('/mod/url/')) type = 'url';
                        
                        activities.push({
                            name: anchor.innerText.trim().replace(/\s+File$/, '').replace(/\s+Assignment$/, ''),
                            url: anchor.href,
                            type
                        });
                    });
                    
                    return { title, activities };
                }).filter(s => s.activities.length > 0);
            });

            await page.close();
            return sections;
        } catch (e: any) {
            await page.close();
            throw new Error(`Failed to load module content for course ${courseId}: ${e.message}`);
        }
    }

    async getDeadlines() {
        if (!this.context) throw new Error('Client not initialized');
        const page = await this.context.newPage();
        await page.goto('https://courseweb.sliit.lk/calendar/view.php?view=upcoming', { waitUntil: 'domcontentloaded', timeout: 30000 });

        const events = await page.evaluate(() => {
            const eventCards = document.querySelectorAll('.event');
            return Array.from(eventCards).map(card => {
                const title = card.querySelector('.name')?.textContent?.trim() || '';
                const descText = card.querySelector('.description')?.textContent?.trim() || '';
                const lines = descText.split('\n').map(l => l.trim()).filter(Boolean);
                const date = lines[0] || '';
                let course = card.querySelector('.course')?.textContent?.trim() || '';
                if (!course && lines.length > 1) {
                    const courseLine = lines.find(l => l.includes(' - ') || l.includes('[20'));
                    if (courseLine) course = courseLine;
                }
                return { title, date, course };
            });
        });

        await page.close();
        return events;
    }

    async downloadFile(url: string, outputDirectory: string = './downloads', customFilename?: string): Promise<string> {
        if (!this.context) throw new Error('Client not initialized');
        
        if (!fs.existsSync(outputDirectory)){
            fs.mkdirSync(outputDirectory, { recursive: true });
        }

        // Method 1: Fast direct authenticated stream via Playwright APIRequestContext (with 1 retry)
        for (let attempt = 1; attempt <= 2; attempt++) {
            try {
                let requestUrl = url;
                if (!requestUrl.includes('forcedownload=1') && (requestUrl.includes('pluginfile.php') || requestUrl.includes('/mod/resource/'))) {
                    requestUrl += (requestUrl.includes('?') ? '&' : '?') + 'forcedownload=1';
                }

                let response = await this.context.request.get(requestUrl, { maxRedirects: 10, timeout: 25000 });
                
                // If Incapsula WAF blocks or returns 403 on pluginfile.php, retry with trailing slash bypass
                if (response.status() === 403 && response.url().includes('pluginfile.php')) {
                    const base = response.url().split('?')[0] || '';
                    const cleanUrl = base.replace(/\/+$/, '');
                    response = await this.context.request.get(cleanUrl + '/?forcedownload=1', { timeout: 25000 });
                }

                const contentType = response.headers()['content-type'] || '';
                const contentDisposition = response.headers()['content-disposition'] || '';
                const isBinary = !contentType.includes('text/html') || contentDisposition.includes('filename=') || response.url().includes('pluginfile.php');
                
                if (response.status() === 200 && isBinary) {
                    let filename = customFilename;
                    if (!filename && contentDisposition) {
                        const matchStar = contentDisposition.match(/filename\*=(?:UTF-8'')?([^;\r\n"']+)/i);
                        if (matchStar && matchStar[1]) {
                            filename = decodeURIComponent(matchStar[1].trim());
                        } else {
                            const matchNormal = contentDisposition.match(/filename=['"]?([^;\r\n"']+)['"]?/i);
                            if (matchNormal && matchNormal[1]) filename = matchNormal[1].trim();
                        }
                    }
                    if (!filename) {
                        const cleanUrl = response.url().replace(/\/\?.*$/, '').split('?')[0] || '';
                        try {
                            const urlPath = new URL(cleanUrl).pathname;
                            filename = decodeURIComponent(path.basename(urlPath));
                        } catch {}
                    }
                    if (!filename || filename === 'view.php') {
                        filename = `download_${Date.now()}`;
                    }

                    // Add extension if missing based on Content-Type
                    if (!path.extname(filename)) {
                        if (contentType.includes('presentation')) filename += '.pptx';
                        else if (contentType.includes('spreadsheet') || contentType.includes('excel')) filename += '.xlsx';
                        else if (contentType.includes('wordprocessing') || contentType.includes('msword')) filename += '.docx';
                        else if (contentType.includes('pdf')) filename += '.pdf';
                        else if (contentType.includes('zip')) filename += '.zip';
                    }

                    filename = sanitizeFilename(filename);

                    const finalPath = path.resolve(outputDirectory, filename);
                    const tempPath = path.resolve(outputDirectory, `.temp_${filename}`);
                    const buffer = await response.body();

                    if (fs.existsSync(finalPath)) {
                        const existingHash = crypto.createHash('md5').update(fs.readFileSync(finalPath)).digest('hex');
                        const newHash = crypto.createHash('md5').update(buffer).digest('hex');
                        if (existingHash === newHash) {
                            return `File already exists and is up-to-date: ${finalPath}`;
                        }
                    }

                    fs.writeFileSync(tempPath, buffer);
                    fs.renameSync(tempPath, finalPath);
                    return `Downloaded new or updated file: ${finalPath}`;
                }
            } catch (e: any) {
                if (attempt === 2) break;
                await new Promise(r => setTimeout(r, 1000));
            }
        }

        // Method 2: Browser page download fallback
        const page = await this.context.newPage();
        try {
            const downloadPromise = page.waitForEvent('download', { timeout: 20000 });
            const pageUrl = url.includes('forcedownload=1') ? url : url + (url.includes('?') ? '&' : '?') + 'forcedownload=1';
            await page.goto(pageUrl, { waitUntil: 'domcontentloaded', timeout: 25000 });
            
            const forceDownloadLink = await page.$('a[href*="forcedownload=1"], .resourceworkaround a');
            if (forceDownloadLink) {
                await forceDownloadLink.click();
            }
            
            const download = await downloadPromise;
            let suggestedName = customFilename || download.suggestedFilename();
            suggestedName = sanitizeFilename(suggestedName);

            const finalPath = path.resolve(outputDirectory, suggestedName);
            const tempPath = path.resolve(outputDirectory, `.temp_${suggestedName}`);
            
            await download.saveAs(tempPath);
            
            if (fs.existsSync(finalPath)) {
                const existingHash = crypto.createHash('md5').update(fs.readFileSync(finalPath)).digest('hex');
                const newHash = crypto.createHash('md5').update(fs.readFileSync(tempPath)).digest('hex');
                
                if (existingHash === newHash) {
                    fs.unlinkSync(tempPath);
                    await page.close();
                    return `File already exists and is up-to-date: ${finalPath}`;
                }
            }
            
            fs.renameSync(tempPath, finalPath);
            await page.close();
            return `Downloaded new or updated file: ${finalPath}`;
        } catch (e: any) {
            await page.close().catch(() => {});
            throw new Error(`Failed to download from ${url}. Error: ${e.message}`);
        }
    }

    async syncModule(courseId: string, outputDirectory: string = './downloads', organizeBySection: boolean = true): Promise<string[]> {
        const sections = await this.getModuleContent(courseId);
        const results: string[] = [];
        
        for (const section of sections) {
            const sectionDir = organizeBySection 
                ? path.resolve(outputDirectory, sanitizeFilename(section.title))
                : path.resolve(outputDirectory);
            
            for (const activity of section.activities) {
                if (activity.type === 'file' && activity.url) {
                    try {
                        const result = await this.downloadFile(activity.url, sectionDir);
                        results.push(`[${section.title}] ${activity.name}: ${result}`);
                    } catch (e: any) {
                        results.push(`[${section.title}] ${activity.name}: Failed - ${e.message}`);
                    }
                } else if (activity.type === 'folder' && activity.url) {
                    try {
                        const folderDir = path.resolve(sectionDir, sanitizeFilename(activity.name));
                        const folderFiles = (activity.files && activity.files.length > 0)
                            ? activity.files
                            : await this.getFolderContents(activity.url);
                        
                        if (folderFiles.length === 0) {
                            results.push(`[${section.title}] [Folder: ${activity.name}]: No downloadable files found`);
                        } else {
                            for (const f of folderFiles) {
                                try {
                                    const result = await this.downloadFile(f.url, folderDir, f.name);
                                    results.push(`[${section.title}] [Folder: ${activity.name}] ${f.name}: ${result}`);
                                } catch (fe: any) {
                                    results.push(`[${section.title}] [Folder: ${activity.name}] ${f.name}: Failed - ${fe.message}`);
                                }
                            }
                        }
                    } catch (e: any) {
                        results.push(`[${section.title}] [Folder] ${activity.name}: Failed - ${e.message}`);
                    }
                }
            }
        }
        return results;
    }

    async checkAssignmentStatus(url: string) {
        if (!this.context) throw new Error('Client not initialized');
        const page = await this.context.newPage();
        await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 30000 });

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
