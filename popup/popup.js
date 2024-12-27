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

async function generateHmacSHA256Signature(message, secret) {
  // Convert the secret and message to Uint8Array
  const encoder = new TextEncoder();
  const keyData = encoder.encode(secret);
  const messageData = encoder.encode(message);

  // Import the secret key
  const key = await crypto.subtle.importKey(
    'raw',
    keyData,
    { name: 'HMAC', hash: { name: 'SHA-256' } },
    false,
    ['sign']
  );

  // Generate the HMAC signature
  const signature = await crypto.subtle.sign('HMAC', key, messageData);

  // Convert the signature to a hex string
  return Array.from(new Uint8Array(signature))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');
}

async function verifyPayment(orderId, razorpayPaymentId, razorpaySignature, secret) {
  const message = `${orderId}|${razorpayPaymentId}`;
  const generatedSignature = await generateHmacSHA256Signature(message, secret);
  if (generatedSignature === razorpaySignature) {
    return true
  } else {
    return false
  }
}

// Payment Gateway API
async function razorpayPaymentGateway(fullName, email, contact) {
  return new Promise(async (resolve, reject) => {
    try {
      const keyId = "KEY_ID"; // Replace with your Razorpay key_id
      const keySecret = "KEY_SECRET"; // Replace with your Razorpay key_secret
      const auth = btoa(`${keyId}:${keySecret}`); // Encode credentials for Basic Auth
    
      // Step 1: Create an order
      const orderResponse = await fetch("https://api.razorpay.com/v1/orders", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Basic ${auth}`,
        },
        body: JSON.stringify({
          amount: 1000, // Amount in paise (₹10)
          currency: "INR"
        }),
      });
    
      if (!orderResponse.ok) {
        resolve({ success: false});
        return;
      }
    
      const order = await orderResponse.json();
    
      // Step 2: Open Razorpay Checkout
      const paymentOptions = {
        key: keyId,
        amount: order.amount,
        currency: order.currency,
        name: "TEST Company",
        description: "Test Transaction",
        order_id: order.id, // Pass the order_id from the response
        handler: async function (response) {
          const result = await verifyPayment(order.id, response.razorpay_payment_id, response.razorpay_signature, keySecret)
          if(result) {
            resolve({success: true});
          } else {
            resolve({success: false});
          }
        },
        prefill: {
          name: fullName,
          email:email,
          contact: contact,
        },
        theme: {
          color: "#4CAF50",
        },
      };
    
      const razorpay = new window.Razorpay(paymentOptions);
      razorpay.open();

      razorpay.on('payment.failed', () => {
        resolve({ success: false});
      })
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
  let titleElement = document.getElementById('titleBeforeImg');
  const imgElement = document.getElementById('image');
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
  const options = { hour: 'numeric', minute: '2-digit', hour12: true, day: 'numeric', month: 'short', year: 'numeric' };

  if (timeDifference < 8 && usageData.unlimited) {
    const expiryTime = new Date(new Date(usageData.date).getTime() + 8 * 60 * 60 * 1000).toLocaleString('en-US', options);
    usageData.unlimited = false;
    upgradeComponent.children[0].innerHTML = '<strong>Thank you for upgrading!</strong>';
    upgradeComponent.children[1].innerHTML = `Your premium access will expire at <strong>${expiryTime}</strong>. <p style="font-size:14px; margin:0px; padding:0px;">Enjoy unlimited card generation until then!</p>`;
  }
  
  const state = JSON.parse(localStorage.getItem('state')) || null;
  if(state) {

    if(!state.isDefaultFormat) {
      titleElement.classList.add('hidden');
      titleElement = document.getElementById('titleAfterImg');
      titleElement.classList.remove('hidden');
    }
    generateCardBtn.classList.add('hidden');
    cardOptions.classList.add('hidden');
    imgElement.src = state.image;
    titleElement.innerText = state.title;
    descElement.innerText = state.description;
    sourceElement.innerText = state.source;
    card.classList.remove('hidden');
    loader.classList.add('hidden');
    cardContent.classList.remove('hidden');
    downloadCard.classList.remove('hidden');
  }

  generateCardBtn.addEventListener("click", async () => {

    if(!titleElement.classList.contains('hidden')) {
      titleElement.classList.add('hidden');
    }

    if(document.getElementById('format1').checked) {
      titleElement = document.getElementById('titleBeforeImg');
      titleElement.classList.remove('hidden');
    } else {
      titleElement = document.getElementById('titleAfterImg');
      titleElement.classList.remove('hidden');
    }
  
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
        sourceElement.innerHTML = `source: ${newsdata.source}`;
  
        loader.classList.add('hidden');
        cardContent.classList.remove('hidden');
        downloadCard.classList.remove('hidden');
  
        // Update usage data
        if (new Date(usageData.date).toDateString() !== new Date(today).toDateString() ) {
          // Reset usage for a new day
          usageData.date = today;
          usageData.clicks = 0;
          usageData.unlimited = false;
        }
        usageData.clicks += 1;
        localStorage.setItem('usage', JSON.stringify(usageData));
        localStorage.setItem('state', JSON.stringify({image: newsdata.image, title: summary.title, description: summary.description, source: `source: ${newsdata.source}`, isDefaultFormat: document.getElementById('format1').checked}));
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
      const state = JSON.parse(localStorage.getItem('state')) || null;
      if (state && state.isDefaultFormat) {
        // Draw Title first
        const title = card.querySelector('h1#titleBeforeImg').textContent;
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
        const title = card.querySelector('h1#titleAfterImg').textContent;
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
      ctx.fillStyle = "#333";
      ctx.font = "26px Arial";
    
      const wrappedDesc = wrapText(ctx, description, 1080 - (0.1 * 1080));
      wrappedDesc.forEach((line, index) => {
        ctx.fillText(line, 50, descriptionHeight + (index * 26));
      });
    
      // Draw Source
      const source = card.querySelector('p#source').textContent;
      ctx.fillStyle = "#706f6f";
      ctx.font = "20px Arial";
      ctx.fillText(source, 50, descriptionHeight + (wrappedDesc.length * 26) + 50);
    
      // Now that everything is drawn, trigger the download
      const dataUrl = canvas.toDataURL('image/png');
      downloadImage(dataUrl);

      //remove state
      localStorage.removeItem('state');
    
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
      const paymentResponse = await razorpayPaymentGateway(fullName, email, contact);
      
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

  document.getElementById("close-btn").addEventListener("click", () => {
    localStorage.removeItem('state');
    window.close(); // Closes the popup window
  });

  document.getElementById("edit-btn").addEventListener("click", function () {
    const editBtn = this; // The edit button
    const cardContent = document.getElementById("cardContent");
  
    // Get all the editable elements (h1, p)
    const editableElements = cardContent.querySelectorAll("h1, p");
  
    if (editBtn.textContent === "✎") {
      // Switch to edit mode
      editableElements.forEach((element) => {
        element.setAttribute("contenteditable", "true");
        element.style.paddingBlock = "4px";
        element.style.marginInline = "5px";
        element.style.border = "1px dashed gray"; // Highlight editable elements
      });
  
      editBtn.textContent = "✔"; // Change button to confirm mode
      editBtn.style.background = "#7cf29c";
    } else {
      // Switch to confirm mode
      editableElements.forEach((element) => {
        element.setAttribute("contenteditable", "false");
        element.style.paddingBlock = "0px";
        element.style.marginInline = "0px";
        element.style.border = "none"; // Remove border
        if(element.innerHTML === '<br>') element.innerHTML = '';
      });
  
      editBtn.textContent = "✎"; // Change button back to edit mode
      editBtn.style.background = "#7272f1";
      const state = JSON.parse(localStorage.getItem('state')) || null;
      localStorage.setItem('state', JSON.stringify({image: imgElement.src, title: titleElement.innerText, description: descElement.innerText, source: sourceElement.innerText, isDefaultFormat: state?.isDefaultFormat}))
    }
  });

  document.getElementById("link")?.addEventListener('click',(e) => {
    e.preventDefault();
    card.classList.add('hidden');
    upgradeComponent.classList.add('hidden');
    generateCardBtn.classList.add('hidden');
    cardOptions.classList.add('hidden');
    quota.classList.remove('hidden');
  })
  
});

// // Disable right-click
// document.addEventListener("contextmenu", (event) => event.preventDefault());

// // Disable specific keyboard shortcuts
// document.addEventListener("keydown", (event) => {
//   if (
//     event.key === "F12" || // F12
//     (event.ctrlKey && event.shiftKey && event.key === "I") || // Ctrl+Shift+I
//     (event.ctrlKey && event.shiftKey && event.key === "J") || // Ctrl+Shift+J
//     (event.ctrlKey && event.key === "U") // Ctrl+U (View Source)
//   ) {
//     event.preventDefault();
//   }
// });

