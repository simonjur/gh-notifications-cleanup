import { Command } from "commander";
import { Octokit } from "octokit";
import process from "node:process";
import prompts from "prompts";
import { cleanupNotifications, listNotifications } from "./notifications.ts";

const program = new Command();
program
  .name("gh-notifications-cleanup")
  .description("CLI for inspecting GitHub notifications")
  .version("1.0.0");

program
  .command("list")
  .description("List titles of all GitHub notifications that can be cleaned up")
  .option(
    "-s, --since <isoDate>",
    "ISO-8601 timestamp to filter newer notifications",
  )
  .action(async ({ since }) => {
    const token = process.env.GITHUB_TOKEN;
    if (!token) {
      console.error("Set GITHUB_TOKEN with a GitHub Personal Access Token.");
      process.exit(1);
    }

    const octokit = new Octokit({ auth: token });

    try {
      const canBeDeleted = await listNotifications(octokit, since);
      if (canBeDeleted.length === 0) {
        console.log(
          "No closed PR/Issue notifications found that can be cleaned up.",
        );
        process.exit(0);
      }
      console.log(
        `Found ${canBeDeleted.length} closed PR/Issue notification(s) that can be cleaned up:`,
      );
      for (const note of canBeDeleted) {
        console.log(
          `- ${note.subject?.title ?? note.id} (${note.reasonToDelete})`,
        );
      }
    } catch (error) {
      console.error(`Failed to read notifications: ${error.message}`);
      process.exit(1);
    }
  });
program
  .command("clean")
  .description("List titles of all GitHub notifications")
  .option(
    "-s, --since <isoDate>",
    "ISO-8601 timestamp to filter newer notifications",
  )
  .action(async ({ since }) => {
    const token = process.env.GITHUB_TOKEN;
    if (!token) {
      console.error("Set GITHUB_TOKEN with a GitHub Personal Access Token.");
      process.exit(1);
    }

    const octokit = new Octokit({ auth: token });

    try {
      const canBeDeleted = await listNotifications(octokit, since);

      if (canBeDeleted.length > 0) {
        const response = await prompts({
          type: "confirm",
          name: "value",
          message: `Found ${canBeDeleted.length} closed PR/Issue notification(s). Do you want to close them?`,
          initial: true,
        });
        if (!response.value) {
          console.log("Aborting cleanup.");
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
