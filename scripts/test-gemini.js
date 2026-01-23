async function testDirectAPI() {
  const apiKey = "AIzaSyDJ1XKJ5jMYhLqDIMsRvdMRB4VWtiU-Nw0";
  
  if (!apiKey) {
    console.error("❌ GEMINI_API_KEY not set");
    process.exit(1);
  }

  console.log("\n🔍 Testing Gemini API (Direct REST)...\n");
  console.log(`API Key: ${apiKey.substring(0, 10)}...${apiKey.substring(apiKey.length - 5)}\n`);

  const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`;

  try {
    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        contents: [{
          parts: [{
            text: "Say 'OK' if you work"
          }]
        }]
      })
    });

    const data = await response.json();

    if (response.ok) {
      console.log("✅ SUCCESS!");
      console.log("Response:", data.candidates[0].content.parts[0].text);
    } else {
      console.log("❌ FAILED!");
      console.log("Error:", JSON.stringify(data, null, 2));
      console.log("\n💡 Solution:");
      console.log("1. Go to: https://aistudio.google.com/app/apikey");
      console.log("2. Create NEW API key in NEW project");
      console.log("3. Make sure 'Generative Language API' is enabled");
      console.log("4. Update .env with new key");
    }

  } catch (error) {
    console.log("❌ Network error:", error.message);
  }
}

testDirectAPI();
