const OPENAI_API_KEY = 'OPENAI_KEY'

chrome.runtime.onMessage.addListener((obj, sender, sendResponse) => {
  const {type, title, content} = obj;
  if (type === "summarizeContent") {

    fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${OPENAI_API_KEY}`,
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        messages: [{"role": "user", content: `Summarize the news article:
          Title: ${title}
          Content: ${content}
          Return a JSON object in the format: { "title": string, "description": string }
          Return {"title": "No Title", "description": "No description"} if:
          1. title or content is not relevant
          2. Multiple topics in the content
          `}],
        max_tokens: 150,
        temperature: 0.7,
      }),
    }).then(response => {
      console.log(response)
      try {
        return response.json()
      }catch(err) {
        return {err}
      }
    }) 
    .then((data) => {
    if (data.choices && data.choices[0]?.message?.content) {
      const summary = JSON.parse(data.choices[0].message.content)
      sendResponse(summary);
    } else {
      sendResponse({ title: 'No Title', description: 'No Description', image:'nil' });
    }
    }).catch((err) => {
      sendResponse({ title: 'No Title', description: 'No Description', image:'nil' });
    })
  }
  return true;
})

