# Setting Up OpenAI API Key for TestraAI

The AI Agent feature in TestraAI requires an OpenAI API key to function. Without it, you'll see an error when trying to use the AI Agent.

## 🔑 Getting Your OpenAI API Key

### Step 1: Create an OpenAI Account

1. Go to [OpenAI Platform](https://platform.openai.com/)
2. Click "Sign up" if you don't have an account
3. Complete the registration process

### Step 2: Generate an API Key

1. Login to [OpenAI Platform](https://platform.openai.com/)
2. Navigate to [API Keys](https://platform.openai.com/api-keys)
3. Click "Create new secret key"
4. Give it a name (e.g., "TestraAI Development")
5. **Copy the key immediately** - you won't be able to see it again!
6. The key will look like: `sk-proj-xxxxxxxxxxxxxxxxxxxxxxxxxxxxx`

### Step 3: Add the Key to Your .env File

1. Open the `.env` file in the project root
2. Find the line that says:
   ```
   # AI_INTEGRATIONS_OPENAI_API_KEY=sk-your-openai-api-key-here
   ```
3. Uncomment it and replace with your actual key:
   ```
   AI_INTEGRATIONS_OPENAI_API_KEY=sk-proj-xxxxxxxxxxxxxxxxxxxxxxxxxxxxx
   ```
4. Save the file

### Step 4: Restart the Development Server

The server needs to be restarted to pick up the new environment variable:

```bash
# Stop the current server (Ctrl+C in the terminal)
# Then restart it:
npm run dev
```

---

## 💰 OpenAI Pricing

The AI Agent uses the **GPT-4o-mini** model, which is very cost-effective:

- **Input**: $0.150 per 1M tokens (~$0.00015 per 1K tokens)
- **Output**: $0.600 per 1M tokens (~$0.0006 per 1K tokens)

**Typical usage for accessibility scanning:**
- A single scan request: ~500-1000 tokens
- Cost per scan: **~$0.0001 - $0.0005** (less than a penny)
- 1,000 scans: **~$0.10 - $0.50**

### Free Tier

New OpenAI accounts get **$5 in free credits** that expire after 3 months. This is enough for:
- **10,000 - 50,000 accessibility scans**
- Perfect for development and testing!

---

## 🧪 Testing the AI Agent

Once you've added your API key and restarted the server:

1. Login to TestraAI at http://localhost:3000/login
2. Navigate to the **AI Agent** page
3. Try these test commands:

### Example Commands

**Basic Scan:**
```
Scan https://www.google.com
```

**Scan with Specific Pages:**
```
Scan https://example.com and check the homepage and about page
```

**Scan Multiple URLs:**
```
Test these sites for accessibility:
- https://www.google.com
- https://www.github.com
```

**Natural Language:**
```
I need to check if my website https://mysite.com is accessible
```

---

## 🔍 Verifying It Works

After sending a scan request, you should see:

1. ✅ AI Agent responds with a confirmation message
2. ✅ Live Testing Panel appears on the right side
3. ✅ Real-time updates showing:
   - Pages being discovered
   - Screenshots of pages being tested
   - Issues being found
   - Progress percentage

If you see an error instead, check:
- ❌ API key is correctly set in `.env`
- ❌ Server was restarted after adding the key
- ❌ API key is valid and not expired
- ❌ OpenAI account has available credits

---

## 🚨 Troubleshooting

### Error: "Incorrect API key provided"

**Problem**: The API key in `.env` is invalid or missing

**Solution**:
1. Check that the key starts with `sk-proj-` or `sk-`
2. Make sure there are no extra spaces or quotes
3. Verify the key is uncommented (no `#` at the start)
4. Restart the server after making changes

### Error: "You exceeded your current quota"

**Problem**: Your OpenAI account has run out of credits

**Solution**:
1. Go to [OpenAI Billing](https://platform.openai.com/account/billing)
2. Add a payment method
3. Add credits to your account (minimum $5)

### Error: "Rate limit exceeded"

**Problem**: Too many requests in a short time

**Solution**:
1. Wait a few seconds and try again
2. Free tier has lower rate limits
3. Consider upgrading to a paid plan for higher limits

### AI Agent not responding

**Problem**: Server might not have picked up the new API key

**Solution**:
1. Stop the server (Ctrl+C)
2. Verify `.env` has the correct key
3. Restart: `npm run dev`
4. Check the terminal for any errors

---

## 🔒 Security Best Practices

### ⚠️ IMPORTANT

1. **Never commit your API key to Git**
   - The `.env` file is already in `.gitignore`
   - Never share your `.env` file publicly

2. **Rotate keys regularly**
   - Generate new keys periodically
   - Delete old keys from OpenAI dashboard

3. **Use different keys for different environments**
   - Development: One key
   - Production: Different key
   - This helps track usage and limit exposure

4. **Monitor usage**
   - Check [OpenAI Usage](https://platform.openai.com/usage)
   - Set up usage limits in your OpenAI account
   - Enable email alerts for high usage

5. **Restrict key permissions**
   - When creating keys, limit permissions if possible
   - Only grant necessary access

---

## 📊 Monitoring Usage

Track your API usage:

1. Go to [OpenAI Usage Dashboard](https://platform.openai.com/usage)
2. View usage by:
   - Date
   - Model (GPT-4o-mini)
   - API key
3. Set up billing alerts to avoid surprises

---

## 🆓 Alternative: Use Without OpenAI (Limited Functionality)

If you don't want to use OpenAI, you can still use TestraAI with limited functionality:

**What works without OpenAI:**
- ✅ Manual accessibility scans (without AI Agent)
- ✅ Direct URL scanning
- ✅ Report generation
- ✅ Issue tracking
- ✅ Project management

**What requires OpenAI:**
- ❌ AI Agent natural language interface
- ❌ Conversational scan requests
- ❌ AI-powered scan suggestions

To run scans without the AI Agent, you can use the API directly or modify the code to bypass the AI Agent.

---

## 📞 Need Help?

- **OpenAI Documentation**: https://platform.openai.com/docs
- **OpenAI Support**: https://help.openai.com/
- **TestraAI Issues**: Check the project repository

---

**Last Updated**: 2025-10-28

