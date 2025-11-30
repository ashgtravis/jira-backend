require('dotenv').config();
const express = require("express");
const axios = require("axios");
const cors = require("cors");

const app = express();
app.use(express.json());
app.use(cors());

// Add a simple request logger to verify requests reach this process
app.use((req, res, next) => {
    console.log(`[REQ] ${req.method} ${req.path}`);
    next();
});

// ENV VARIABLES
const JIRA_BASE = process.env.JIRA_BASE;
const JIRA_EMAIL = process.env.JIRA_EMAIL;
const JIRA_API_TOKEN = process.env.JIRA_API_TOKEN;
const PROJECT_KEY = process.env.PROJECT_KEY;

// Create Base64 auth token
const authToken = Buffer.from(`${JIRA_EMAIL}:${JIRA_API_TOKEN}`).toString("base64");

/* ----------------------------------------
   HEALTH CHECK
-----------------------------------------*/
// Log when the health route is registered (helps confirm this file was loaded)
console.log('Registering GET / (health check)');
app.get("/", (req, res) => {
    res.json({
        status: "ok",
        message: "Jira backend running 🚀"
    });
});

/* ----------------------------------------
   1) CREATE TICKET (ADF description)
-----------------------------------------*/
app.post("/create-ticket", async (req, res) => {
    try {
        const { title, description, priority } = req.body;

        const payload = {
            fields: {
                project: { key: PROJECT_KEY },
                summary: title,

                // ADF DESCRIPTION (REQUIRED BY JIRA CLOUD)
                description: {
                    "type": "doc",
                    "version": 1,
                    "content": [
                        {
                            "type": "paragraph",
                            "content": [
                                {
                                    "type": "text",
                                    "text": description
                                }
                            ]
                        }
                    ]
                },

                issuetype: { name: "Task" },
                priority: { name: priority }
            }
        };

        const response = await axios.post(
            `${JIRA_BASE}/rest/api/3/issue`,
            payload,
            {
                headers: {
                    "Authorization": `Basic ${authToken}`,
                    "Content-Type": "application/json"
                }
            }
        );

        return res.json({
            success: true,
            key: response.data.key,
            url: `${JIRA_BASE}/browse/${response.data.key}`
        });

    } catch (err) {
        console.log("CREATE TICKET ERROR:", err.response?.data || err.message);

        res.status(500).json({
            success: false,
            error: err.response?.data || err.message
        });
    }
});


/* ----------------------------------------
   2) GET TICKET STATUS
-----------------------------------------*/
app.post("/get-ticket", async (req, res) => {
    try {
        const { ticketKey } = req.body;

        const response = await axios.get(
            `${JIRA_BASE}/rest/api/3/issue/${ticketKey}`,
            {
                headers: {
                    "Authorization": `Basic ${authToken}`,
                    "Content-Type": "application/json"
                }
            }
        );

        const data = response.data;

        return res.json({
            success: true,
            key: ticketKey,
            summary: data.fields.summary,
            status: data.fields.status.name,
            assignee: data.fields.assignee
                ? data.fields.assignee.displayName
                : "Unassigned"
        });

    } catch (err) {
        console.log("GET TICKET ERROR:", err.response?.data || err.message);

        res.status(500).json({
            success: false,
            error: err.response?.data || err.message
        });
    }
});

/* ----------------------------------------
   404 Fallback
-----------------------------------------*/
app.use((req, res) => {
    console.log(`[404] ${req.method} ${req.path}`);
    res.status(404).json({ success: false, error: "Not Found" });
});


/* ----------------------------------------
   START SERVER
-----------------------------------------*/
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`🚀 Server running on port ${PORT}`);
});