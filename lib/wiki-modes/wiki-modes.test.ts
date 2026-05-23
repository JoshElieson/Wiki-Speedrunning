import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { wikiArticleQuerySchema } from "@/server/validation/api-schemas";
import {
  ALL_WIKI_MODES,
  getWikiMode,
  getWikiModeFromNullable,
  isLikelyModeArticleTitle,
  wikipediaWikiMode,
} from "./index";

describe("wiki mode registry", () => {
  it("registers all six product modes", () => {
    const ids = ALL_WIKI_MODES.map((mode) => mode.id).sort();
    assert.deepEqual(ids, ["league", "marvel", "minecraft", "pokemon", "star-wars", "wikipedia"]);
  });

  it("keeps Wikipedia enabled for the default race flow", () => {
    assert.equal(getWikiMode("wikipedia").enabled, true);
    assert.equal(wikipediaWikiMode.eloScope, "wikipedia");
  });

  it("maps legacy starwars id to star-wars", () => {
    assert.equal(getWikiModeFromNullable("starwars"), "star-wars");
  });

  it("extracts Wikipedia /wiki/ titles and blocks File: namespace", () => {
    const mode = getWikiMode("wikipedia");
    assert.equal(mode.extractTitleFromHref("/wiki/Alan_Turing"), "Alan Turing");
    assert.equal(mode.extractTitleFromHref("https://en.wikipedia.org/wiki/Alan_Turing"), "Alan Turing");
    assert.equal(mode.extractTitleFromHref("/wiki/File:Example.jpg"), null);
    assert.equal(isLikelyModeArticleTitle("wikipedia", "File:Example"), false);
    assert.equal(isLikelyModeArticleTitle("wikipedia", "Alan Turing"), true);
  });

  it("accepts article API query shape when optional mode is null (URLSearchParams)", () => {
    const parsed = wikiArticleQuerySchema.safeParse({
      title: "Mars",
      wikiId: "wikipedia",
      mode: null,
    });
    assert.equal(parsed.success, true);
    if (parsed.success) {
      assert.equal(parsed.data.title, "Mars");
      assert.equal(parsed.data.wikiId, "wikipedia");
    }
  });

  it("matches race targets with disambiguation stripping", () => {
    const mode = getWikiMode("wikipedia");
    assert.equal(mode.matchesRaceTarget("Nexus", "Nexus (League of Legends)"), true);
    assert.equal(mode.matchesRaceTarget("Wrong Page", "Target Page"), false);
  });

  it("extracts Bulbapedia /wiki/ titles including Unicode Pokémon titles", () => {
    const mode = getWikiMode("pokemon");
    assert.equal(mode.extractTitleFromHref("/wiki/Pikachu_(Pok%C3%A9mon)"), "Pikachu (Pokémon)");
    assert.equal(
      mode.extractTitleFromHref("https://bulbapedia.bulbagarden.net/wiki/Pikachu_(Pok%C3%A9mon)"),
      "Pikachu (Pokémon)",
    );
    assert.equal(mode.extractTitleFromHref("/wiki/Bulbapedia:About"), null);
    assert.equal(isLikelyModeArticleTitle("pokemon", "Pikachu (Pokémon)"), true);
    assert.equal(mode.matchesRaceTarget("Pikachu (Pokémon)", "Pikachu_(Pokémon)"), true);
  });

  it("loads Bulbapedia reader stylesheet for pokemon mode", () => {
    const mode = getWikiMode("pokemon");
    assert.match(mode.reader.styleSheetHref ?? "", /bulbapedia\.bulbagarden\.net\/w\/load\.php/);
  });

  it("uses the official League of Legends wiki host and paths", () => {
    const mode = getWikiMode("league");
    assert.equal(mode.baseUrl, "https://wiki.leagueoflegends.com");
    assert.equal(mode.apiEndpoint, "https://wiki.leagueoflegends.com/en-us/api.php");
    assert.equal(mode.extractTitleFromHref("/en-us/Garen"), "Garen");
    assert.equal(
      mode.extractTitleFromHref("https://wiki.leagueoflegends.com/en-us/Nexus"),
      "Nexus",
    );
    assert.equal(
      mode.extractTitleFromHref("https://wiki.leagueoflegends.com/en-us/Universe:Taliyah"),
      "Universe:Taliyah",
    );
    assert.equal(
      mode.extractTitleFromHref("https://wiki.leagueoflegends.com/en-us/Universe:Rek%27Sai"),
      "Universe:Rek'Sai",
    );
    assert.equal(isLikelyModeArticleTitle("league", "Universe: Xolan"), true);
    assert.equal(mode.extractTitleFromHref("https://leagueoflegends.fandom.com/wiki/Garen"), null);
    assert.match(mode.reader.styleSheetHrefs?.[0] ?? "", /wiki\.leagueoflegends\.com\/en-us\/load\.php/);
  });
});
