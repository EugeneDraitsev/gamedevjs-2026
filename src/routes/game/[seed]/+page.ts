import type { PageLoad } from "./$types";

export const load: PageLoad = ({ params }) => ({
  seed: params.seed,
});
