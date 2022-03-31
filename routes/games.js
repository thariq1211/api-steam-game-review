const express = require("express");
const router = express.Router();
const cheerio = require("cheerio");
const fetchHtml = require("../helpers/axios");

const extractDeal = (selector) => {
  const title = selector
    .find(".responsive_search_name_combined")
    .find("div[class='col search_name ellipsis'] > span[class='title']")
    .text()
    .trim();

  const releaseDate = selector
    .find(".responsive_search_name_combined")
    .find("div[class='col search_released responsive_secondrow']")
    .text()
    .trim();

  const link = selector.attr("href").trim();

  return {
    title,
    releaseDate,
    link,
  };
};

const scrapSteam = async (game) => {
  const steamUrl = `https://store.steampowered.com/search/?term=${game}`;

  const html = await fetchHtml(steamUrl);
  const selector = cheerio.load(html);
  const searchResults = selector("body").find(
    "#search_result_container > #search_resultsRows > a"
  );

  const deals = searchResults
    .map((idx, el) => {
      const elementSelector = selector(el);
      return extractDeal(elementSelector);
    })
    .get();
  return deals;
};

const getGameInfo = async (app) => {
  const linkApp = `https://store.steampowered.com/app/${app}`;
  const fetch = await fetchHtml(linkApp);
  const selector = cheerio.load(fetch);
  const body = selector("body");

  const extractText = (selector) => {
    const result = body.find(selector).html().trim();
    return result;
  };

  const title = extractText(
    "body > div.responsive_page_frame.with_header > div.responsive_page_content > div.responsive_page_template_content > div.game_page_background.game > div.page_content_ctn > div.page_title_area.game_title_area.page_content > div.apphub_HomeHeaderContent > div > div.apphub_AppName"
  );

  const description = extractText(
    "#game_highlights > div.rightcol > div > div.game_description_snippet"
  );

  const resultPrize = () => {
    try {
      return extractText(
        "#game_area_purchase > div:nth-child(1) > div > div.game_purchase_action > div > div.game_purchase_price.price"
      );
    } catch (error) {
      try {
        return extractText(
          "#game_area_purchase > div.game_area_purchase_game > div.game_purchase_action > div > div.game_purchase_price.price"
        );
      } catch (error) {
        return extractText(
          "#game_area_purchase > div.game_area_purchase_game_wrapper > div > div.game_purchase_action > div > div.game_purchase_price.price"
        );
      }
    }
  };

  const overallReview = () => {
    try {
      return extractText(
        "#game_highlights > div.rightcol > div > div.glance_ctn_responsive_left > div > div:nth-child(2) > div.summary.column > span.game_review_summary.positive"
      );
    } catch (error) {
      try {
        return extractText(
          "#game_highlights > div.rightcol > div > div.glance_ctn_responsive_left > div > div:nth-child(1) > div.summary.column > span.game_review_summary.mixed"
        );
      } catch (error) {
        return extractText(
          "#game_highlights > div.rightcol > div > div.glance_ctn_responsive_left > div > div.user_reviews_summary_row > div.summary.column > span.game_review_summary.positive"
        );
      }
    }
  };

  const releaseDate = body
    .find(
      "#game_highlights > div.rightcol > div > div.glance_ctn_responsive_left > div > div.release_date > div.date"
    )
    .html()
    .trim();

  let arrayMisc = [];
  const misc = body.find("#category_block > div.game_area_details_specs > a");

  misc.map((idx, el) => {
    const element = selector(el);
    const miscVal = element.html().trim();
    arrayMisc.push(miscVal);
  });

  const genre = (sort) => {
    try {
      const result = extractText(
        `body > div.responsive_page_frame.with_header > div.responsive_page_content > div.responsive_page_template_content > div.game_page_background.game > div.page_content_ctn > div:nth-child(6) > div.rightcol.game_meta_data > div:nth-child(9) > div > div > div > a:nth-child(${sort})`
      );
      return result;
    } catch (error) {
      try {
        const result = extractText(
          `body > div.responsive_page_frame.with_header > div.responsive_page_content > div.responsive_page_template_content > div.game_page_background.game > div.page_content_ctn > div:nth-child(6) > div.rightcol.game_meta_data > div:nth-child(10) > div > div > div > a:nth-child(${sort})`
        );
        return result;
      } catch (error) {
        const result = extractText(
          `body > div.responsive_page_frame.with_header > div.responsive_page_content > div.responsive_page_template_content > div.game_page_background.game > div.page_content_ctn > div:nth-child(6) > div.rightcol.game_meta_data > div:nth-child(11) > div > div > div > a:nth-child(${sort})`
        );
        return result;
      }
    }
  };

  const genres = [genre(4), genre(5)];

  const metaScore = () => {
    try {
      return extractText("#game_area_metascore > div.score.high");
    } catch (error) {
      return null;
    }
  };

  const developer = extractText("#developers_list > a");

  const ss = body
    .find(
      "#game_highlights > div.rightcol > div > div.game_header_image_ctn > img"
    )
    .attr("src");

  return {
    title,
    description,
    image: ss,
    steamLink: linkApp,
    developer,
    overallReview: overallReview(),
    metaScore: metaScore(),
    releaseDate,
    prize: resultPrize(),
    genres,
    miscelanous: arrayMisc,
  };
};

/**
 * List Router /api/games
 */

router.get("/", async (req, res) => {
  res.sendStatus(200);
});

router.get("/:search", async (req, res) => {
  try {
    const result = await scrapSteam(req.params.search);
    if (result.length > 0) {
      res.send({ message: "sukses", data: result });
    } else {
      res.send({ message: "null" });
    }
  } catch (error) {
    res.send({ message: "null", error: error.message });
  }
});

router.get("/getDetails/:game", async (req, res) => {
  try {
    const result = await getGameInfo(req.params.game);
    res.send({ message: "sukses", data: result });
  } catch (error) {
    res.send({ message: "null", error: error.message });
  }
});

module.exports = router;
