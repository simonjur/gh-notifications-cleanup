import { Command } from 'commander';
import { Octokit } from 'octokit';
import process from 'node:process';
import prompts from 'prompts';

const program = new Command();
program
    .name('gh-notifications-cleanup')
    .description('CLI for inspecting GitHub notifications')
    .version('1.0.0');

type TCanBeDeletedItem = {
    id: string;
    subject?: {
        title: string;
    }
}

async function cleanupNotifications(octokit: Octokit, canBeDeleted: TCanBeDeletedItem[]) {
    for (const note of canBeDeleted) {
        try {
            await octokit.request('DELETE /notifications/threads/{thread_id}', {
                thread_id: note.id,
            });
            console.log(`Marking ${note.subject?.title ?? note.id} as DONE`);
        } catch (unsubscribeError) {
            const message = unsubscribeError instanceof Error ? unsubscribeError.message : String(unsubscribeError);
            console.warn(`[ERROR] Failed to unsubscribe from notification ${note.id}: ${message}`);
        }
    }
}

async function listNotifications(octokit: Octokit, since?: string) {
    const notifications = await octokit.paginate('GET /notifications', {
        since,
        per_page: 100,
        page: 1
    });

    if (notifications.length === 0) {
        console.log('No notifications found.');
        return;
    }

    console.log(`Found ${notifications.length} notifications:\n`);

    //todo: add progress bar here
    console.log ('Now scanning for closed PRs and Issues...\n');

    const canBeDeleted = [];
    for (const note of notifications) {
        if (note.subject?.type === 'PullRequest' && note.subject.url) {
            try {
                const { data: pr } = await octokit.request(note.subject.url);
                if (pr.state === 'closed') {
                    canBeDeleted.push(note);
                }
            } catch (prError) {
                const message = prError instanceof Error ? prError.message : String(prError);
                console.warn(`[ERROR] Failed to load pull request for notification ${note.id}: ${message}`);
            }
        } else if (note.subject?.type === 'Issue' && note.subject.url) {
            try {
                const { data: issue } = await octokit.request(note.subject.url);
                if (issue.state === 'closed') {
                    canBeDeleted.push(note);
                }
            } catch (issueError) {
                const message = issueError instanceof Error ? issueError.message : String(issueError);
                console.warn(`[ERROR] Failed to load issue for notification ${note.id}: ${message}`);
            }
        }
    }
    return canBeDeleted;
}

program
    .command('list')
    .description('List titles of all GitHub notifications that can be cleaned up')
    .option('-s, --since <isoDate>', 'ISO-8601 timestamp to filter newer notifications')
    .action(async ({ since }) => {
        const token = process.env.GITHUB_TOKEN;
        if (!token) {
            console.error('Set GITHUB_TOKEN with a GitHub Personal Access Token.');
            process.exit(1);
        }

        const octokit = new Octokit({ auth: token });

        try {
            const canBeDeleted = await listNotifications(octokit, since);
            console.log(`Found ${canBeDeleted.length} closed PR/Issue notification(s) that can be cleaned up.`);
        } catch (error) {
            console.error(`Failed to read notifications: ${error.message}`);
            process.exit(1);
        }
    });
program
    .command('clean')
    .description('List titles of all GitHub notifications')
    .option('-s, --since <isoDate>', 'ISO-8601 timestamp to filter newer notifications')
    .action(async ({ since }) => {
        const token = process.env.GITHUB_TOKEN;
        if (!token) {
            console.error('Set GITHUB_TOKEN with a GitHub Personal Access Token.');
            process.exit(1);
        }

        const octokit = new Octokit({ auth: token });

        try {
            const canBeDeleted = await listNotifications(octokit, since);

            if (canBeDeleted.length > 0) {
                const response = await prompts({
                    type: 'confirm',
                    name: 'value',
                    message: `Found ${canBeDeleted.length} closed PR/Issue notification(s). Do you want to close them?`,
                    initial: true
                });
                if (!response.value) {
                    console.log('Aborting cleanup.');
                    process.exit(0);
                }
                console.log(`Cleanup notifications...`);
                await cleanupNotifications(octokit, canBeDeleted);
            }
        } catch (error) {
            console.error(`Failed to read notifications: ${error.message}`);
            process.exit(1);
        }
    });

program.parse(process.argv);