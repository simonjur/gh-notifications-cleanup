import { Command } from 'commander';
import { Octokit } from 'octokit';
import process from 'node:process';

const program = new Command();
program
    .name('gh-notifications-cleanup')
    .description('CLI for inspecting GitHub notifications')
    .version('1.0.0');

program
    .command('list')
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
                // let statusLabel = '';
                if (note.subject?.type === 'PullRequest' && note.subject.url) {
                    try {
                        const { data: pr } = await octokit.request(note.subject.url);
                        if (pr.state === 'closed') {
                            // statusLabel = ' [CLOSED PR] <-- can be deleted!';
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
                            // statusLabel = ' [CLOSED ISSUE] <-- can be deleted';
                            canBeDeleted.push(note);
                        }
                    } catch (issueError) {
                        const message = issueError instanceof Error ? issueError.message : String(issueError);
                        console.warn(`[ERROR] Failed to load issue for notification ${note.id}: ${message}`);
                    }
                }

            }

            console.log("\nSummary:");
            console.log(`Total notifications: ${notifications.length}`);
            console.log(`Can be deleted (closed PRs/Issues): ${canBeDeleted.length}`);

            //todo: add a confirmation

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

            //
        } catch (error) {
            console.error(`Failed to read notifications: ${error.message}`);
            process.exit(1);
        }
    });

program.parse(process.argv);