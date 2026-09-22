import rss from "@astrojs/rss";
import type { APIContext } from "astro";
import { marked } from "marked";
import { blogPosts } from "@/data/blog";

const FULL_CONTENT_IDS = new Set(["z0d1ak-hadopelagic-vmception"]);

// RSS is XML 1.0: render NUL as visible text, drop other illegal control chars
const xmlSafe = (html: string) =>
  html.replace(/\x00/g, "\\x00").replace(/[\x01-\x08\x0B\x0C\x0E-\x1F]/g, "");

export async function GET(context: APIContext) {
  return rss({
    title: "Rigalis Blog",
    description: "Binary notes, reverse engineering, and design explorations.",
    site: context.site ?? "https://rigalis.me",
    trailingSlash: false,
    items: await Promise.all(
      blogPosts.map(async (post) => ({
        title: post.title,
        description: post.description,
        pubDate: new Date(post.date),
        link: `/blog/${post.id}`,
        ...(FULL_CONTENT_IDS.has(post.id)
          ? { content: xmlSafe(await marked.parse(post.content)) }
          : {}),
      }))
    ),
  });
}
