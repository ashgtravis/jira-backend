require('dotenv').config();
const express = require("express");
const axios = require("axios");
const cors = require("cors");

const app = express();
app.use(express.json());
app.use(cors());

// ENV VARIABLES
const JIRA_BASE = process.env.JIRA_BASE;
const JIRA_EMAIL = process.env.JIRA_EMAIL;
const JIRA_API_TOKEN = process.env.JIRA_API_TOKEN;
const PROJECT_KEY = process.env.PROJECT_KEY;

// Create Base64 token
const authToken = Buffer.from(`${JIRA_EMAIL}:${JIRA_API_TOKEN}`).toString("base64");

/* ----------------------------------------
   1) CREATE TICKET
-----------------------------------------*/
app.post("/create-ticket", async (req, res) => {
    try {
        const { title, description, priority } = req.body;

        const response = await axios.post(
            `${JIRA_BASE}/rest/api/3/issue`,
            {
                fields: {
                    project: { key: PROJECT_KEY },
                    summary: title,
                    description: description,
                    issuetype: { name: "Task" },
                    priority: { name: priority }
                }
            },
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
        console.log(err.response?.data || err.message);
        res.status(500).json({
            success: false,
            error: err.response?.data || err.message
        });
    }
});

/* ----------------------------------------
   2) GET TICKET
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
        res.json({
            success: true,
            key: ticketKey,
            summary: data.fields.summary,
            status: data.fields.status.name,
            assignee: data.fields.assignee ? data.fields.assignee.displayName : "Unassigned"
        });

    } catch (err) {
        console.log(err.response?.data || err.message);
        res.status(500).json({
            success: false,
            error: err.response?.data || err.message
        });
    }
});


// SERVER START
app.listen(3000, () => {
    console.log("🚀 Server running on port 3000");
});
