import { VisitorInterface } from "@rtsdk/topia";

interface FireToastArgs {
  visitor: VisitorInterface;
  groupId: string;
  title: string;
  text: string;
}

/**
 * Fire a Topia in-world toast on behalf of the given visitor. Mirrors the
 * `.fireToast(...).catch(...)` pattern in `awardBadge.ts`: toast failures
 * are non-fatal — we log and move on so a flaky toast call can't break
 * puzzle completion or session timeout flows.
 */
export const fireToast = async ({ visitor, groupId, title, text }: FireToastArgs): Promise<void> => {
  await visitor.fireToast({ groupId, title, text }).catch((err) => {
    console.error(`Failed to fire toast "${title}":`, err);
  });
};
