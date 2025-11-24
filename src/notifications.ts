import {Octokit} from "octokit";
import type {TCanBeDeletedItem} from "./types.ts";

export async function cleanupNotifications(
    octokit: Octokit,
    canBeDeleted: TCanBeDeletedItem[],
) {
    for (const note of canBeDeleted) {
        try {
            await octokit.request("DELETE /notifications/threads/{thread_id}", {
                thread_id: note.id,
            });
            console.log(`Marking ${note.subject?.title ?? note.id} as DONE`);
        } catch (unsubscribeError) {
            const message =
                unsubscribeError instanceof Error
                    ? unsubscribeError.message
                    : String(unsubscribeError);
            console.warn(
                `[ERROR] Failed to unsubscribe from notification ${note.id}: ${message}`,
            );
        }
    }
}

export async function listNotifications(octokit: Octokit, since?: string) {
    const notifications = await octokit.paginate("GET /notifications", {
        since,
        per_page: 100,
        page: 1,
    });

    if (notifications.length === 0) {
        console.log("No notifications found.");
        return;
    }

    console.log(`Found ${notifications.length} notifications:\n`);

    //todo: add progress bar here
    console.log("Now scanning for closed PRs and Issues...\n");

    const canBeDeleted = [];
    for (const note of notifications) {
        if (note.subject?.type === "PullRequest" && note.subject.url) {
            try {
                const { data: pr } = await octokit.request(note.subject.url);
                if (pr.state === "closed") {
                    canBeDeleted.push(note);
                }
            } catch (prError) {
                const message =
                    prError instanceof Error ? prError.message : String(prError);
                console.warn(
                    `[ERROR] Failed to load pull request for notification ${note.id}: ${message}`,
                );
            }
        } else if (note.subject?.type === "Issue" && note.subject.url) {
            try {
                const { data: issue } = await octokit.request(note.subject.url);
                if (issue.state === "closed") {
                    canBeDeleted.push(note);
                }
            } catch (issueError) {
                const message =
                    issueError instanceof Error ? issueError.message : String(issueError);
                console.warn(
                    `[ERROR] Failed to load issue for notification ${note.id}: ${message}`,
                );
            }
        }
    }
    return canBeDeleted;
}