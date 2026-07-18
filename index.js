const PORT = 8000
const axios = require("axios")
const cheerio = require("cheerio")
const express = require("express")

const app = express()

const BASE_URL = "https://www.theguardian.com"
const url = `${BASE_URL}/us`

axios(url)
    .then(response => {
        const html = response.data
        const $ = cheerio.load(html)
        const articles = []
        const seenUrls = new Set()

        // The Guardian's markup no longer exposes stable class names for
        // headlines (the old ".fc-item__title" selector is from their
        // pre-redesign "Frontend" markup and now matches nothing, so this
        // silently returned an empty array on every run). Headlines are now
        // rendered as h3/h4 elements nested inside an <a>, so we select on
        // that structure instead, since it's less likely to change than
        // generated CSS class names.
        $('h3, h4').each(function () {
            const link = $(this).closest('a')
            if (!link.length) return

            // h3/h4 headline elements often nest a leading "kicker" div
            // (section label, e.g. "Analysis" or a live-blog badge) alongside
            // the actual headline text in a <span>. Taking $(this).text()
            // on the whole element concatenates the kicker straight onto the
            // headline with no separator (e.g. "AnalysisIran proves..."), so
            // prefer the last non-empty <span> - that's consistently where
            // the real headline text lives - falling back to the full
            // element text if no such span exists.
            const headlineSpans = $(this).find('span').filter(function () {
                return $(this).text().trim().length > 0
            })
            const title = headlineSpans.length
                ? $(headlineSpans[headlineSpans.length - 1]).text().trim()
                : $(this).text().trim()
            let articleUrl = link.attr('href')
            if (!title || !articleUrl) return

            // Guardian markup mixes absolute and site-relative hrefs.
            if (articleUrl.startsWith('/')) {
                articleUrl = `${BASE_URL}${articleUrl}`
            }

            // The same headline can appear in more than one module on the
            // page (e.g. a hero card and a "most viewed" rail); de-dupe by
            // the article URL so callers don't see repeats.
            if (seenUrls.has(articleUrl)) return
            seenUrls.add(articleUrl)

            articles.push({
                title,
                url: articleUrl,
            })
        })

        if (articles.length === 0) {
            console.warn('No articles found - the Guardian markup may have changed again; selector needs updating.')
        }

        console.log(articles)
    }).catch(err => console.log(err))

app.listen(PORT, () => console.log(`server running on PORT ${PORT}`))
