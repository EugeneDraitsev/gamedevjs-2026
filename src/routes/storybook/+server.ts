import { redirect } from "@sveltejs/kit";

export const GET = () => {
  throw redirect(308, "/storybook/index.html");
};

export const prerender = true;
