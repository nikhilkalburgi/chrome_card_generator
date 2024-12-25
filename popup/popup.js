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

function validateInputs() {
  // Get the input elements
  const fullName = document.getElementById('fullName').value.trim();
  const email = document.getElementById('email').value.trim();
  const contact = document.getElementById('contact').value.trim();
  const statusMessage = document.getElementById('statusMessage');

  // Regular expressions for validation
  const nameRegex = /^[a-zA-Z\s]+$/; // Allows only alphabets and spaces
  const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
  const contactRegex = /^\d{10}$/; // Allows exactly 10 digits for contact

  // Validate Full Name
  if (!fullName) {
    statusMessage.innerHTML = 'Full Name is required.';
    return false;
  } else if (!nameRegex.test(fullName)) {
    statusMessage.innerHTML = 'Full Name should contain only alphabets and spaces.';
    return false;
  }

  // Validate Email
  if (!email) {
    statusMessage.innerHTML = 'Email is required.';
    return false;
  } else if (!emailRegex.test(email)) {
    statusMessage.innerHTML = 'Please enter a valid email address.';
    return false;
  }

  // Validate Contact
  if (!contact) {
    statusMessage.innerHTML = 'Contact is required.';
    return false;
  } else if (!contactRegex.test(contact)) {
    statusMessage.innerHTML = 'Contact should be a valid 10-digit number.';
    return false;
  }
  statusMessage.innerHTML = '';
  return true;
}

// Payment Gateway API
async function fakePaymentGateway(fullName, email, contact) {
  return new Promise((resolve, reject) => {
    try {
      // Razorpay payment options
      const options = {
        key: "YOUR_RAZORPAY_KEY_ID", // Replace with your Razorpay Key ID
        amount: 10 * 100, // Amount in paisa (₹10)
        currency: "INR",
        name: "Card Generator",
        description: "Unlock unlimited card generation for one day",
        handler: function (response) {
          // Payment successful
          resolve({ success: true });
        },
        prefill: {
          name: fullName,
          email: email,
          contact: contact,
        },
        theme: {
          color: "#F37254",
        },
      };

      // Check if Razorpay is loaded
      if (!window.Razorpay) {
        resolve({success: false});
      }

      try {  // Open Razorpay Checkout
        const rzp = new window.Razorpay(options);
        rzp.open();
      }catch(error) {
        resolve({ success: false});
      }

      // Handle payment failure
      rzp.on("payment.failed", function (response) {
        resolve({ success: false});
      });
    } catch (error) {
      resolve({ success: false});
    }
  });
}

document.addEventListener("DOMContentLoaded", () => {
  const radioButtons = document.querySelectorAll("input[name='cardFormat']");
  const placeholderCards = document.querySelectorAll(".card-placeholder");
  const generateCardBtn = document.getElementById("generateCard");
  const card = document.getElementById('card');
  const quota = document.getElementById('quota');
  const imgElement = document.getElementById('image');
  const titleElement = document.getElementById('title');
  const descElement = document.getElementById('description');
  const sourceElement = document.getElementById('source');
  const loader = document.getElementById('loading');
  const cardContent = document.getElementById('cardContent');
  const downloadCard = document.getElementById('downloadCard');
  const cardOptions = document.getElementById('cardOptions'); 
  const upgradeComponent = document.getElementById('upgradeComponent');

  const usageData = JSON.parse(localStorage.getItem('usage')) || {};
  const lastCheckTime = new Date(usageData.date);
  const currentTime = new Date();
  const timeDifference = (currentTime - lastCheckTime) / (1000 * 60 * 60); // Convert milliseconds to hours

  if (timeDifference < 8 && usageData.unlimited) {
    usageData.unlimited = false;
    upgradeComponent.children[0].innerHTML = '<strong>Thank you for upgrading!</strong>';
    upgradeComponent.children[1].innerHTML = `Your premium access will expire at <strong>${usageData.date}</strong>. <p style="font-size:14px; margin:0px; padding:0px;">Enjoy unlimited card generation until then!</p>`;
  }

  generateCardBtn.addEventListener("click", async () => {
  
    loader.classList.remove('hidden');
    card.classList.remove('hidden');
    generateCardBtn.classList.add('hidden');
    cardOptions.classList.add('hidden');
   
    if(!cardContent.classList.contains('hidden')) {
      cardContent.classList.add('hidden');
      downloadCard.classList.add('hidden');
    }
    
    const options = { hour: 'numeric', minute: '2-digit', hour12: true, day: 'numeric', month: 'short', year: 'numeric' };
    const today = new Date().toLocaleString('en-US', options);
    const usageData = JSON.parse(localStorage.getItem('usage')) || {};
    const lastCheckTime = new Date(usageData.date);
    const currentTime = new Date();
    const timeDifference = (currentTime - lastCheckTime) / (1000 * 60 * 60); // Convert milliseconds to hours
  
    if (timeDifference >= 8) {
      usageData.unlimited = false;
      upgradeComponent.children[0].innerHTML = 'Generate up to 2 news cards for FREE!'
      upgradeComponent.children[1].innerHTML = '<a href="#" class="link">Upgrade</a> for just ₹10/- and enjoy unlimited access for the next 8 hours!'
    }
    
    // Quota exceeded
    if (new Date(usageData.date).toDateString() === new Date(today).toDateString() && usageData.clicks >= 2 && !usageData.unlimited) {
      card.classList.add('hidden');
      quota.classList.remove('hidden');
      upgradeComponent.classList.add('hidden');

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
        descElement.innerHTML = summary.description;
        sourceElement.innerHTML = newsdata.source;
  
        document.getElementById('loading').classList.add('hidden');
        document.getElementById('cardContent').classList.remove('hidden');
        document.getElementById('downloadCard').classList.remove('hidden');
  
        // Update usage data
        if (new Date(usageData.date).toDateString() !== new Date(today).toDateString() ) {
          // Reset usage for a new day
          usageData.date = today;
          usageData.clicks = 0;
          usageData.unlimited = false;
        }
        usageData.clicks += 1;
        localStorage.setItem('usage', JSON.stringify(usageData));
      });
  
  });

  document.getElementById('downloadCard').addEventListener('click', function() {
    
    // Create a canvas element
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    
    // Set canvas dimensions
    canvas.width = 1080;
    canvas.height = 1080;
  
    // Draw the background color of the card
    ctx.fillStyle = "#fff";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    
    // Draw image
    const img = card.querySelector('img');
    const image = new Image();
    
    image.onload = function () {
      // Function to download the image
      function downloadImage(dataUrl) {
        const link = document.createElement('a');
        link.href = dataUrl;
        link.download = 'news-card.png';
        link.click();
      }
    
      let titleHeight = 0; 
      let descriptionHeight = 0;
    
      if (document.getElementById('format1').checked) {
        // Draw Title first
        const title = card.querySelector('h1').textContent;
        ctx.fillStyle = "#333";
        ctx.font = "bold 34px Arial";
    
        const wrappedTitle = wrapText(ctx, title, 1080 - (0.1 * 1080));
        wrappedTitle.forEach((line, index) => {
          titleHeight = 50 + (index * 34); // Title at the top
          ctx.fillText(line, 50, titleHeight);
        });
    
        // Draw Image below Title
        const imageYPosition = titleHeight + 30; // Space below title
        ctx.drawImage(image, 50, imageYPosition, 980, 0.55 * 1080);
    
        descriptionHeight = imageYPosition + 0.55 * 1080 + 50; // Description below the image
      } else {
        // Draw Image first
        ctx.drawImage(image, 50, 50, 980, 0.55 * 1080);
    
        // Draw Title below Image
        const title = card.querySelector('h1').textContent;
        ctx.fillStyle = "#333";
        ctx.font = "bold 34px Arial";
    
        const imageHeight = 0.55 * 1080;
        const wrappedTitle = wrapText(ctx, title, 1080 - (0.1 * 1080));
        wrappedTitle.forEach((line, index) => {
          titleHeight = imageHeight + 130 + (index * 34); // Space below image
          ctx.fillText(line, 50, titleHeight);
        });
    
        descriptionHeight = titleHeight + 50; // Description below the title
      }
    
      // Draw Description
      const description = card.querySelector('p').textContent;
      ctx.fillStyle = "#555";
      ctx.font = "26px Arial";
    
      const wrappedDesc = wrapText(ctx, description, 1080 - (0.1 * 1080));
      wrappedDesc.forEach((line, index) => {
        ctx.fillText(line, 50, descriptionHeight + (index * 26));
      });
    
      // Draw Source
      const source = card.querySelector('p#source').textContent;
      ctx.fillStyle = "#545353";
      ctx.font = "20px Arial";
      ctx.fillText(source, 50, descriptionHeight + (wrappedDesc.length * 26) + 50);
    
      // Now that everything is drawn, trigger the download
      const dataUrl = canvas.toDataURL('image/png');
      downloadImage(dataUrl);
    
      // Hide and show relevant elements after download
      card.classList.add('hidden');
      downloadCard.classList.add('hidden');
      generateCardBtn.classList.remove('hidden');
      cardOptions.classList.remove('hidden');
    };
    
    image.src = img.src || 'default.webp';    
  
  });

  // Simulated payment gateway integration
  document.getElementById('payButton').addEventListener('click', async () => {

    if(!validateInputs()) {
      return;
    }

    const options = { hour: 'numeric', minute: '2-digit', hour12: true, day: 'numeric', month: 'short', year: 'numeric' };
    const today = new Date().toLocaleString('en-US', options);
    const expiryTime = new Date(new Date(today).getTime() + 8 * 60 * 60 * 1000).toLocaleString('en-US', options);

    card.classList.remove('hidden');
    quota.classList.add('hidden')
    
    try {
      // Fake API call to payment gateway
      const fullName = document.getElementById('fullName').value.trim();
      const email = document.getElementById('email').value.trim();
      const contact = document.getElementById('contact').value.trim();
      const paymentResponse = await fakePaymentGateway(fullName, email, contact);
      
      if (paymentResponse.success) {
        const usageData = JSON.parse(localStorage.getItem('usage')) || {};
        usageData.date = today;
        usageData.unlimited = true; // Unlimited access flag
        localStorage.setItem('usage', JSON.stringify(usageData));
        card.classList.add('hidden');
        generateCardBtn.classList.remove('hidden');
        cardOptions.classList.remove('hidden');
        upgradeComponent.children[0].innerHTML = '<strong>Thank you for upgrading!</strong>'
        upgradeComponent.children[1].innerHTML = `Your premium access will expire at <strong>${expiryTime}</strong>. <p style="font-size:14px; margin:0px; padding:0px;">Enjoy unlimited card generation until then!</p>`
        upgradeComponent.classList.remove('hidden');
      } else {
        card.classList.add('hidden');
        upgradeComponent.classList.add('hidden');
        quota.classList.remove('hidden');
        statusMessage.textContent =
          "Payment failed. Please try again.";
      }
    } catch (error) {
      console.error(error);
      card.classList.add('hidden');
      upgradeComponent.classList.add('hidden');
      quota.classList.remove('hidden');
      statusMessage.textContent =
        "An error occurred during payment. Please try again.";
    }
  });

  radioButtons.forEach((radio, index) => {
    radio.addEventListener("change", () => {
      placeholderCards.forEach((cardPlaceholder, cardIndex) => {
        cardPlaceholder.style.border = cardIndex === index ? "1px solid #4caf50" : "1px solid #ccc";
      });
    });
  });
});
