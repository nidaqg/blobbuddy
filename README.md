# BlobBuddy 👻

BlobBuddy is your emotional support extension for VS Code, featuring Wisps — soft little flame-like friends who float beside you while you code. ✨

---

## Features

- **Custom Name**  
  On first activation, BlobBuddy asks what to call you. Your Wisp will address you by this name in all its messages.  
  Use **Wisp: Reset User Name** from the Command Palette to change it anytime.

- **Random Quips**  
  Every time you open the Wisp panel or return to the sidebar, your Wisp shares a fresh, encouraging message tailored with your name.

- **Mood-Based Animation**  
  BlobBuddy tracks how many compiler or linter **errors** you have:
  - **😊 Happy** (no errors)  
  - **🔵 Focused** (1–5 errors)  
  - **😟 Worried** (more than 5 errors)  
  The Wisp’s flame gets a soft colored glow—white, blue, or red—matching its mood.

- **Continuous-Typing Break Reminder**  
  If you type continuously for **one hour** (allowing brief pauses under 5 minutes), BlobBuddy gently nudges you with a break reminder. 
  This reminder pops up even if you never open the Wisp panel!

- **Today & Tomorrow Reminders**  
  - **Set Reminder for Today**: Store a one-off reminder that displays under “🔔 Reminder for Today” in the sidebar.  
  - **Set Reminder for Tomorrow**: Store a plan under “🔔 Reminder for Tomorrow” that appears in the sidebar today.  
  - **Midnight Rollover**: At midnight, “Tomorrow” becomes “Today,” and the old reminders clear automatically.  
  - **Clear Reminders**: You can clear either slot independently if plans change.

---

## Setup

1. Run `npm install` in the root folder  
2. Run `npm run build`  
3. Press `F5` in VS Code to launch extension debug mode  

## Commands

- **Wisp: Show Wisp**  
  Opens your companion blob panel.

- **Wisp: Reset User Name**  
  Clears your stored name and prompts you to enter a new one.

- **Wisp: Set Reminder for Today**  
  Prompts for a one-line reminder that appears under “🔔 Reminder for Today.”

- **Wisp: Set Reminder for Tomorrow**  
  Prompts for a note that appears under “🔔 Reminder for Tomorrow” (then rolls over to Today at midnight).

- **Wisp: Clear Reminder for Today**  
  Removes the current Today reminder from the sidebar.

- **Wisp: Clear Reminder for Tomorrow**  
  Removes the current Tomorrow reminder from the sidebar.

---

Enjoy coding with your new emotional support buddy! 🚀  
