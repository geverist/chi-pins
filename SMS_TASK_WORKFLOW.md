# SMS Task Workflow

## Overview

This system allows you to send development tasks via SMS, which are then processed by an AI task manager and executed by Claude Code.

## Workflow

```
User → SMS → AI Task Manager → Supabase → Claude Code → Execution → SMS Response
```

### 1. Send SMS Task
Send an SMS to your Twilio number with a development task request:
```
"Add a dark mode toggle to the settings panel"
```

### 2. AI Task Manager Processes
The AI task manager (separate process) receives the SMS and:
- Analyzes the request
- Creates a task in Supabase `autonomous_tasks` table
- Sets status to `awaiting_confirmation` or `confirmed`
- Extracts task type, complexity, and creates an execution plan

### 3. Claude Code Picks Up Task
Run this command to check for pending tasks:
```bash
node scripts/execute-sms-tasks.js
```

This will display:
- Task ID
- Status
- Request text
- AI plan
- Commands to execute

### 4. Execute Task

#### Mark as Processing
```bash
node scripts/update-task-status.js <task-id> processing
```

#### Execute the Task
Use Claude Code to implement the request. Example:
```bash
claude: "Add a dark mode toggle to the settings panel as requested in the SMS task"
```

#### Mark as Completed
```bash
node scripts/update-task-status.js <task-id> completed <commit-hash> "Dark mode toggle added successfully"
```

#### Mark as Failed (if needed)
```bash
node scripts/update-task-status.js <task-id> failed "Error message here"
```

### 5. SMS Response
When you mark a task as completed or failed, an SMS is automatically sent back with the result.

## Scripts

### `scripts/execute-sms-tasks.js`
Fetches the next pending task from Supabase and displays it.

```bash
# Check for pending tasks
node scripts/execute-sms-tasks.js

# Get JSON output
node scripts/execute-sms-tasks.js --json
```

### `scripts/update-task-status.js`
Updates task status in Supabase and sends SMS responses.

```bash
# Mark as processing
node scripts/update-task-status.js <task-id> processing

# Mark as completed
node scripts/update-task-status.js <task-id> completed <commit-hash> "success message"

# Mark as failed
node scripts/update-task-status.js <task-id> failed "error message"
```

### `scripts/send-sms-update.js`
Send standalone SMS updates.

```bash
node scripts/send-sms-update.js "Task completed successfully!"
```

### `scripts/check-tasks.js`
View all recent tasks and their status.

```bash
node scripts/check-tasks.js
```

## Task Statuses

- **awaiting_confirmation** - Task created, waiting for approval
- **confirmed** - Task approved, ready for execution
- **processing** - Task is being worked on
- **completed** - Task successfully completed
- **failed** - Task failed with error

## Environment Variables

Required in `.env`:
```bash
# Supabase
VITE_SUPABASE_URL=your_supabase_url
VITE_SUPABASE_ANON_KEY=your_supabase_key

# Twilio (for SMS responses)
TWILIO_ACCOUNT_SID=your_twilio_sid
TWILIO_AUTH_TOKEN=your_twilio_token
TWILIO_PHONE_NUMBER=your_twilio_number
ALERT_PHONE=+17204507540
```

## Example Full Workflow

1. **Send SMS**:
   ```
   "Fix the blue squares on the attractor screen"
   ```

2. **Check for tasks**:
   ```bash
   node scripts/execute-sms-tasks.js
   ```

3. **Start execution**:
   ```bash
   node scripts/update-task-status.js 289481dd-cc68-4010-be43-3a7fa92576e8 processing
   ```

4. **Implement in Claude Code**:
   ```bash
   claude: "Fix the blue squares on WalkupAttractor by centering the halo rings"
   ```

5. **Complete task**:
   ```bash
   node scripts/update-task-status.js 289481dd-cc68-4010-be43-3a7fa92576e8 completed 0a84a74 "Fixed halo ring positioning - blue squares resolved"
   ```

6. **SMS sent automatically**:
   ```
   ✅ Task completed: Fix the blue squares on the attractor screen

   Commit: 0a84a74
   Fixed halo ring positioning - blue squares resolved
   ```

## Integration with Claude Code

You can now send tasks via SMS and have them executed in this Claude Code session. The workflow is:

1. SMS arrives → AI task manager creates task in Supabase
2. Run `node scripts/execute-sms-tasks.js` to see pending tasks
3. Tell Claude Code to execute the task
4. Claude Code implements the changes
5. Update task status with commit hash
6. User receives SMS confirmation

This creates a seamless remote development workflow where you can manage your kiosk from anywhere via SMS!
