import { z } from "zod";
import { wikiArticleQuerySchema } from "@/server/validation/api-schemas";

export { wikiArticleQuerySchema };
export type WikiArticleQuery = z.infer<typeof wikiArticleQuerySchema>;
