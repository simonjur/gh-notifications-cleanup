import { Octokit } from "octokit";
import type { TCanBeDeletedItem } from "./types.ts";
import PQueue from "p-queue";
import yoctoSpinner from "yocto-spinner";

function cleanupNotification(
  octokit: Octokit,
  item: TCanBeDeletedItem,
): Promise<void> {
  return octokit
    .request("DELETE /notifications/threads/{thread_id}", {
      thread_id: item.id,
    })
    .then(() => {
      console.log(`Marking ${item.subject?.title ?? item.id} as DONE`);
    })
    .catch((unsubscribeError: unknown) => {
      const message = (unsubscribeError as Error).message;
      console.warn(
        `[ERROR] Failed to mark notification ${item.id} as done: ${message}`,
      );
    });
}

export async function cleanupNotifications(
  octokit: Octokit,
  canBeDeleted: TCanBeDeletedItem[],
) {
  const queue = new PQueue({ concurrency: 10 });

  for (const note of canBeDeleted) {
    queue.add(() => cleanupNotification(octokit, note));
  }

  await queue.onIdle();
}

async function markPullRequestNotification(
  octokit: Octokit,
  notification: TNotification,
  canBeDeleted: TCanBeDeletedItem[],
) {
  try {
    const { data: pr } = await octokit.request(notification.subject.url);
    if (pr.state === "closed") {
      canBeDeleted.push({
        ...notification,
        reasonToDelete: "Pull Request is closed",
      });
    }
  } catch (prError) {
    const message =
      prError instanceof Error ? prError.message : String(prError);
    console.warn(
      `[ERROR] Failed to load pull request for notification ${notification.id}: ${message}`,
    );
  }
}

async function markIssueNotification(
  octokit: Octokit,
  notification: TNotification,
  canBeDeleted: TCanBeDeletedItem[],
) {
  try {
    const { data: issue } = await octokit.request(notification.subject.url);
    if (issue.state === "closed") {
      canBeDeleted.push({
        ...notification,
        reasonToDelete: "Issue is closed",
      });
    }
  } catch (issueError) {
    const message =
      issueError instanceof Error ? issueError.message : String(issueError);
    console.warn(
      `[ERROR] Failed to load issue for notification ${notification.id}: ${message}`,
    );
  }
}

type TNotification = {
  id: string;
  subject?: {
    title: string;
    type: string;
    url: string;
  };
};

export async function listNotifications(octokit: Octokit, since?: string) {
  const notifications: TNotification[] = await octokit.paginate(
    "GET /notifications",
    {
      since,
      per_page: 100,
    },
  );

  if (notifications.length === 0) {
    console.log("No notifications found.");
    return;
  }

  console.log(`Found ${notifications.length} notifications:\n`);

  const spinner = yoctoSpinner({
    text: "Now scanning for closed PRs and Issues…",
  }).start();

  const canBeDeleted: TCanBeDeletedItem[] = [];
  for (const notification of notifications) {
    if (
      notification.subject?.type === "PullRequest" &&
      notification.subject.url
    ) {
      await markPullRequestNotification(octokit, notification, canBeDeleted);
    } else if (
      notification.subject?.type === "Issue" &&
      notification.subject.url
    ) {
      await markIssueNotification(octokit, notification, canBeDeleted);
    }
  }
  spinner.success("Done scanning.");
  return canBeDeleted;
}
