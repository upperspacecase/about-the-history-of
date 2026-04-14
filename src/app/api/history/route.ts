import Anthropic from "@anthropic-ai/sdk";

const client = new Anthropic();

const SYSTEM_PROMPT = `You are a historian and analyst. Given a news headline, provide a structured historical analysis of the underlying topic.

Your response must be valid JSON with this exact structure:
{
  "topic": "The core historical topic extracted from the headline (e.g. 'U.S. Federal Reserve Interest Rate Policy')",
  "summary": "A 2-3 sentence overview connecting the headline to its deeper historical roots. Write in a clear, authoritative editorial voice.",
  "timeline": [
    {
      "year": "Year or date range (e.g. '1944', '1960s', '1971-1973')",
      "title": "Short event title",
      "description": "1-2 sentence description of this event and its significance",
      "link": "A Wikipedia URL for further reading on this specific event (use the most specific article available)"
    }
  ],
  "patterns": [
    {
      "title": "Short pattern name (e.g. 'Boom-Bust Cycles')",
      "description": "1-2 sentences explaining this recurring pattern and how it connects to the headline"
    }
  ],
  "furtherReading": [
    {
      "title": "Title of a well-known book, documentary, or long-form article on this topic",
      "author": "Author name",
      "type": "book | documentary | article",
      "link": "A Wikipedia URL for the book/documentary, or a well-known publication URL for articles"
    }
  ],
  "whyItMattersNow": "2-3 sentences explaining why the historical context makes today's headline more meaningful. What pattern is repeating? What precedent should we be watching?"
}

Guidelines:
- Include 6-10 timeline events, ordered chronologically
- Include 3-4 recurring patterns
- Include 3-5 further reading recommendations
- Be specific with dates, names, and facts
- For links, use Wikipedia URLs (https://en.wikipedia.org/wiki/Article_Name) — they are stable and accessible
- Focus on the most significant and illuminating historical events
- Write clearly for a general audience in an editorial news voice
- Return ONLY the JSON object, no other text`;

export async function POST(request: Request) {
  try {
    const { headline } = await request.json();

    if (!headline || typeof headline !== "string") {
      return Response.json(
        { error: "A headline is required" },
        { status: 400 }
      );
    }

    if (headline.length > 500) {
      return Response.json(
        { error: "Headline is too long (max 500 characters)" },
        { status: 400 }
      );
    }

    const message = await client.messages.create({
      model: "claude-sonnet-4-20250514",
      max_tokens: 3000,
      system: SYSTEM_PROMPT,
      messages: [
        {
          role: "user",
          content: `News headline: "${headline}"`,
        },
      ],
    });

    const text =
      message.content[0].type === "text" ? message.content[0].text : "";
    const parsed = JSON.parse(text);

    return Response.json(parsed);
  } catch (err) {
    console.error("History API error:", err);

    if (err instanceof SyntaxError) {
      return Response.json(
        { error: "Failed to parse historical analysis" },
        { status: 500 }
      );
    }

    return Response.json(
      { error: "Failed to generate historical analysis" },
      { status: 500 }
    );
  }
}
