import { redirect } from "@sveltejs/kit";
import type { PageLoad } from "./$types";

const defaultSeed = "polygon-001";
const removedSmokeTestSeed = "core-prison-visual-smoke";

export const load: PageLoad = ({ params, url }) => {
  if (params.seed === removedSmokeTestSeed) {
    const search = url.searchParams.toString();

    throw redirect(307, `/game/${defaultSeed}${search ? `?${search}` : ""}`);
  }

  return {
    seed: params.seed,
  };
};
