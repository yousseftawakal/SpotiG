const axios = require("axios");
const qs = require("qs");
const Vibrant = require("node-vibrant");
const cheerio = require("cheerio");
require("dotenv").config();

module.exports = async (req, res) => {
  const { songUrlVal } = req.body;

  if (!songUrlVal) {
    console.log("Error: Song URL is missing");
    return res.status(400).json({ error: "Song URL is required" });
  }

  const trackId = songUrlVal.split("/").pop().split("?")[0];

  try {
    const tokenResponse = await axios.post(
      "https://accounts.spotify.com/api/token",
      qs.stringify({
        grant_type: "client_credentials",
      }),
      {
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
          Authorization: `Basic ${Buffer.from(
            `${process.env.SPOTIFY_CLIENT_ID}:${process.env.SPOTIFY_CLIENT_SECRET}`
          ).toString("base64")}`,
        },
      }
    );
    const accessToken = tokenResponse.data.access_token;

    const songResponse = await axios.get(`https://api.spotify.com/v1/tracks/${trackId}`, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    });

    const songData = songResponse.data;

    const coverUrl = songData.album.images[0].url;
    let dominantColor = "Not Available";

    try {
      const palette = await Vibrant.from(coverUrl).getPalette();
      dominantColor = palette.Vibrant ? palette.Vibrant.hex : "Not Available";
    } catch (colorError) {
      console.error("Error extracting color:", colorError.message);
    }

    const songTitle = songData.name;

    const artistNames = songData.artists.map((artist) => artist.name);

    const searchFormat = `${(songTitle.match(/[^()]+(?=\()/g)
      ? songTitle.match(/[^()]+(?=\()/g).join(" ")
      : songTitle
    ).replace(/ /g, "+")}+${artistNames.join(" ").replace(/ /g, "+")}`;

    const googleSearch = `https://www.google.com/search?q=${searchFormat}+lyrics`;

    const geniusTokenResponse = await axios.post(
      "https://api.genius.com/oauth/token",
      qs.stringify({
        grant_type: "client_credentials",
        client_id: process.env.GENIUS_CLIENT_ID,
        client_secret: process.env.GENIUS_CLIENT_SECRET,
      }),
      {
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
        },
      }
    );
    const geniusAccessToken = geniusTokenResponse.data.access_token;

    const geniusSearchResponse = await axios.get(`https://api.genius.com/search`, {
      params: { q: searchFormat },
      headers: {
        Authorization: `Bearer ${geniusAccessToken}`,
      },
    });

    const lyricsPath = geniusSearchResponse.data.response.hits[0]?.result?.path;
    let lyricsHTML = "<p>No lyrics available</p>";

    if (lyricsPath) {
      const lyricsPageResponse = await axios.get(`https://genius.com${lyricsPath}`);
      const $ = cheerio.load(lyricsPageResponse.data);
      const lyricsElement = $(".Lyrics__Container-sc-1ynbvzw-1");

      let lyricsText = lyricsElement.html();

      lyricsText = lyricsText.replace(/<br\s*\/?>/g, "\n");

      const cleanedText = $(lyricsText).text().trim();

      const lines = cleanedText.split("\n").filter((line) => line.trim() !== "" && !/\[.*?\]/.test(line.trim()));
      lyricsHTML = lines.map((line) => `<span dir="auto">${line}</span>`).join("");
    }

    res.json({
      cover: coverUrl,
      title: songTitle,
      artists: artistNames,
      color: dominantColor,
      googleSearch,
      lyrics: lyricsHTML,
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};
