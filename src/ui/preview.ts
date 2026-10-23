// Branch previews (see tools/build-site.sh) open everything up for testing:
// every shift, boss night, Overtime and scrapbook page.
export const PREVIEW_BRANCH: string | undefined = import.meta.env.VITE_PREVIEW_BRANCH;
export const UNLOCK_ALL = Boolean(PREVIEW_BRANCH);
