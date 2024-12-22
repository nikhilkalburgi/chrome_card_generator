(()=> {
  function extractContent() {
      const data = {
        title: null,
        content: null,
        image: null,
      };
  
      // Try OpenGraph metadata
      const ogTitle = document.querySelector('meta[property="og:title"]');
      const ogDescription = document.querySelector('meta[property="og:description"]');
      const ogImage = document.querySelector('meta[property="og:image"]');
  
      if (ogTitle) data.title = ogTitle.content;
      if (ogDescription) data.content = ogDescription.content;
      if (ogImage) data.image = ogImage.content;
  
      // Fallback to semantic tags
      if (!data.title) data.title = document.querySelector('h1')?.innerText || "No title found";

      // Extract main content
      const article = document.querySelector('article') || document.querySelector('main') || document.body;

      if (article) {
        const textNodes = [];
        const ignoreTags = ["script", "style", "header", "footer", "nav", "aside"];
        const ignoreClasses = ["ad", "promo", "sidebar", "footer", "nav", "banner"];

        // Recursive function to extract meaningful text
        function extractTextFromNode(node) {
            if (ignoreTags.includes(node.tagName?.toLowerCase())) return;

            if (node.nodeType === Node.TEXT_NODE) {
              const text = node.nodeValue.trim();
              if (text.length > 50) textNodes.push(text); // Ignore very short text
            } else if (node.nodeType === Node.ELEMENT_NODE) {
              const classList = Array.from(node.classList || []);

              //Ignore irrelevant text
              if (classList.some((cls) => ignoreClasses.some((ignore) => cls.includes(ignore)))) return;

              // Traverse child nodes
              node.childNodes.forEach(extractTextFromNode);
            }
        }

        extractTextFromNode(article);

        // Combine all text nodes
        data.content += textNodes.join("\n\n");
      }
  
      // Fallback to first meaningful image
      if (!data.image) {
        const img = document.querySelector('article img') || document.querySelector('main img');
        data.image = img?.src || null;
      }
  
      return data;
    }
    
    function isAbsoluteURL(url) {
      try {
        const parsedUrl = new URL(url);
        return !!parsedUrl.protocol && !!parsedUrl.host;
      } catch (error) {
        return false;
      }
    }

    chrome.runtime.onMessage.addListener((obj, sender, response) => {

        if (obj.type === "extractNewsData") {
            const {title, content, image} = extractContent();
            const source = location.hostname?.split('.') || [];
            const isAbsolute = isAbsoluteURL(image);
            response({ title, content, image: isAbsolute ? image: "", source: source[source.length - 2] || "No Source" });
          }
    });
})(); 