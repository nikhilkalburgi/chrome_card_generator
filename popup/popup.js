document.getElementById("generateCard").addEventListener("click", async () => {

  const card = document.getElementById('card');
  const imgElement = document.getElementById('image');
  const titleElement = document.getElementById('title');
  const descElement = document.getElementById('description');
  const sourceElement = document.getElementById('Source');
  card.classList.remove('hidden');

  const today = new Date().toDateString(); // Get today's date as a string
  const usageData = JSON.parse(localStorage.getItem('usage')) || {};
  // Quota exceeded
  if (usageData.date === today && usageData.clicks >= 2) {
      card.innerHTML = `
      <h1>Quota Exceeded</h1>
      <p>You can only generate 2 cards per day. Please try again tomorrow.</p>
      `;
      return;
  }

  const tabs = await chrome.tabs.query({
    currentWindow: true,
    active: true
  });
  
  const newsdata = await chrome.tabs.sendMessage(tabs[0].id, {
    type: "extractNewsData",
  });
  chrome.runtime.sendMessage({
    type: "summarizeContent",
    title: newsdata.title,
    content: newsdata?.content?.substr(0, 1000)
  }, (summary) => {

      imgElement.src = newsdata.image;
      titleElement.innerHTML = summary.title;
      descElement.innerHTML = summary.description.substr(0, 200);
      sourceElement.innerHTML = newsdata.source;

      document.getElementById('loading').classList.add('hidden');
      document.getElementById('cardContent').classList.remove('hidden');
      document.getElementById('downloadCard').classList.remove('hidden');

      // Update usage data
      if (usageData.date !== today) {
        // Reset usage for a new day
        usageData.date = today;
        usageData.clicks = 0;
      }
      usageData.clicks += 1;
      localStorage.setItem('usage', JSON.stringify(usageData));
    });

  });

document.getElementById('downloadCard').addEventListener('click', function() {
  const container = document.getElementById('card');
  
  // Create a canvas element
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');
  
  // Set canvas dimensions
  canvas.width = 1080;
  canvas.height = 1080;

  // Draw the background color of the container
  ctx.fillStyle = "#fff";
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  
  
  // Draw image
  const img = container.querySelector('img');
  const image = new Image();
  
  image.onload = function() {
    // Adjust the image size and draw it
    ctx.drawImage(image, 0, 0, 1080, 0.55 * 1080); 
    
    // Function to download the image
    function downloadImage(dataUrl) {
      const link = document.createElement('a');
      link.href = dataUrl;
      link.download = 'news-card.png'; 
      link.click();
    }
  
    // Draw text (Title)
    const title = container.querySelector('h1').textContent;
    ctx.fillStyle = "#333";
    ctx.font = "bold 34px Arial";
    let titleHeight = 0
    // Wrap text to fit inside the canvas width
    const wrappedTitle = wrapText(ctx, title, 1080 - (0.1 * 1080));

    // Draw the wrapped text on the canvas
    wrappedTitle.forEach((line, index) => {
      titleHeight = 0.6 * 1080 + (index * 34)
      ctx.fillText(line, 50, titleHeight); 
    });
    
    // Draw description (Text)
    const description = container.querySelector('p').textContent;
    ctx.fillStyle = "#555"; 
    ctx.font = "26px Arial";
    let descriptionHeight = 0;

    const wrappeddesc = wrapText(ctx, description, 1080 - (0.1 * 1080));

    // Draw the wrapped text on the canvas
    wrappeddesc.forEach((line, index) => {
      descriptionHeight = titleHeight + 50 + (index * 26)
      ctx.fillText(line, 50, descriptionHeight); 
    });

     // Draw Source (Text)
     const source = container.querySelector('p#Source').textContent;
     ctx.fillStyle = "#545353"; 
     ctx.font = "20px Arial";
     ctx.fillText(source, 50, descriptionHeight + 76);

    // Now that everything is drawn, trigger the download
    const dataUrl = canvas.toDataURL('image/png');
    downloadImage(dataUrl);
  };
  
  image.src = img.src || 'default.webp'; 

});

// Function to wrap text based on the maximum width
function wrapText(context, text, maxWidth) {
  const words = text.split(' ');
  let lines = [];
  let currentLine = '';

  words.forEach((word) => {
    // Add the word to the current line
    const testLine = currentLine + word + ' ';
    const metrics = context.measureText(testLine);

    // If the line exceeds the max width, push the current line to lines and start a new line
    if (metrics.width > maxWidth) {
      lines.push(currentLine);
      currentLine = word + ' ';
    } else {
      currentLine = testLine;
    }
  });

  // Push the last line to lines array
  lines.push(currentLine);

  return lines;
}