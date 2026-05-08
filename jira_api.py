import requests
from requests.auth import HTTPBasicAuth
import json

def log_step(message):
    print(f"[JiraAPI] {message}")

class JiraAPIClient:
    def __init__(self, config):
        self.base_url = config['base_url']
        self.email = config['email']
        self.token = config['secret']
        self.auth = HTTPBasicAuth(self.email, self.token)
        self.headers = {
            "Accept": "application/json",
            "Content-Type": "application/json"
        }

    def _get_user_account_id(self, query):
        log_step(f"Searching for user account ID: {query}")
        url = f"{self.base_url}/rest/api/3/user/search"
        params = {"query": query}
        response = requests.get(url, auth=self.auth, headers=self.headers, params=params)
        
        if response.status_code == 200:
            users = response.json()
            if users:
                return users[0]['accountId']
        
        log_step(f"Could not find user account ID for {query}")
        return None

    def _get_sprint_id(self, sprint_name):
        log_step(f"Searching for sprint ID: {sprint_name}")
        url = f"{self.base_url}/rest/agile/1.0/sprint"
        response = requests.get(url, auth=self.auth, headers=self.headers)
        if response.status_code == 200:
            sprints = response.json().get('values', [])
            for s in sprints:
                if s['name'].lower() == sprint_name.lower():
                    return s['id']
        
        log_step(f"Could not find sprint with name {sprint_name}")
        return None

    def create_issue(self, data):
        project_key = data.get('project_key')
        summary = data.get('summary')
        description = data.get('description', '')
        issue_type = data.get('issue_type', 'Task')
        assignee = data.get('assignee', '')
        labels = data.get('labels', '')
        sprint = data.get('sprint', '')

        account_id = None
        if assignee:
            account_id = self._get_user_account_id(assignee)

        payload = {
            "fields": {
                "project": {"key": project_key},
                "summary": summary,
                "issuetype": {"name": issue_type},
                "labels": [l.strip() for l in labels.split(',')] if labels else [],
            }
        }

        if description:
            payload["fields"]["description"] = {
                "version": 1,
                "type": "doc",
                "content": [
                    {
                        "type": "paragraph",
                        "content": [
                            {"type": "text", "text": description}
                        ]
                    }
                ]
            }

        if account_id:
            payload["fields"]["assignee"] = {"accountId": account_id}

        log_step("Sending request to create issue...")
        url = f"{self.base_url}/rest/api/3/issue"
        response = requests.post(url, auth=self.auth, headers=self.headers, json=payload)

        if response.status_code == 201:
            result = response.json()
            ticket_id = result['key']
            log_step(f"Ticket created successfully: {ticket_id}")
            
            if sprint:
                sprint_id = self._get_sprint_id(sprint)
                if sprint_id:
                    log_step(f"Assigning ticket {ticket_id} to sprint {sprint_id}")
                    sprint_url = f"{self.base_url}/rest/agile/1.0/sprint/{sprint_id}/issue"
                    sprint_payload = {"issueId": result['id']}
                    requests.post(sprint_url, auth=self.auth, headers=self.headers, json=sprint_payload)
                else:
                    log_step(f"Warning: Sprint '{sprint}' not found, skipping assignment.")

            return {
                "success": True,
                "ticket_id": ticket_id,
                "url": f"{self.base_url}/browse/{ticket_id}"
            }
        else:
            error_msg = response.text
            log_step(f"Failed to create issue: {error_msg}")
            return {"success": False, "error": f"Jira API Error: {response.status_code} - {error_msg}"}

    def get_sprints(self):
        """Fetch all available sprints."""
        log_step("Fetching available sprints...")
        url = f"{self.base_url}/rest/agile/1.0/sprint"
        response = requests.get(url, auth=self.auth, headers=self.headers)
        if response.status_code == 200:
            return response.json().get('values', [])
        return []

    def get_sprint_metrics(self, sprint_id):
        """Fetch issues for a specific sprint and calculate metrics."""
        log_step(f"Fetching issues for sprint {sprint_id}...")
        url = f"{self.base_url}/rest/agile/1.0/sprint/{sprint_id}/issue"
        response = requests.get(url, auth=self.auth, headers=self.headers)
        
        if response.status_code != 200:
            return {"success": False, "error": "Failed to fetch sprint issues"}
        
        issues = response.json().get('issues', [])
        
        # Metrics calculation
        total_issues = len(issues)
        status_counts = {}
        
        for issue in issues:
            status = issue['fields'].get('status', {}).get('name', 'Unknown')
            status_counts[status] = status_counts.get(status, 0) + 1
            
        return {
            "success": True,
            "total_issues": total_issues,
            "status_distribution": status_counts,
            "issues": [
                {"key": i['key'], "summary": i['fields']['summary'], "status": i['fields']['status']['name']}
                for i in issues
            ]
        }

    def get_assignable_users(self, project_key):
        """Fetch assignable users for a project."""
        log_step(f"Fetching assignable users for project {project_key}...")
        url = f"{self.base_url}/rest/api/3/user/assignable/search"
        params = {"project": project_key, "maxResults": 50}
        response = requests.get(url, auth=self.auth, headers=self.headers, params=params)
        
        if response.status_code == 200:
            users = response.json()
            return [{"displayName": u.get('displayName'), "accountId": u.get('accountId'), "emailAddress": u.get('emailAddress')} for u in users]
        
        log_step(f"Failed to fetch assignable users: {response.text}")
        return []

    def get_active_sprint(self, board_id):
        """Fetch the first active sprint for a board."""
        log_step(f"Fetching active sprint for board {board_id}...")
        url = f"{self.base_url}/rest/agile/1.0/board/{board_id}/sprint"
        params = {"state": "active"}
        response = requests.get(url, auth=self.auth, headers=self.headers, params=params)
        
        if response.status_code == 200:
            sprints = response.json().get('values', [])
            if sprints:
                s = sprints[0]
                return {
                    "id": s.get('id'),
                    "name": s.get('name'),
                    "startDate": s.get('startDate'),
                    "endDate": s.get('endDate')
                }
        
        log_step(f"No active sprint found for board {board_id}")
        return None

    def get_tickets_for_sprint(self, sprint_id):
        """Fetch all tickets for a sprint with pagination."""
        log_step(f"Fetching tickets for sprint {sprint_id}...")
        all_issues = []
        start_at = 0
        max_results = 100
        
        while True:
            url = f"{self.base_url}/rest/agile/1.0/sprint/{sprint_id}/issue"
            params = {
                "startAt": start_at,
                "maxResults": max_results,
                "fields": "summary,status,assignee,issuetype,priority,labels,story_points"
            }
            response = requests.get(url, auth=self.auth, headers=self.headers, params=params)
            
            if response.status_code != 200:
                log_step(f"Failed to fetch sprint tickets: {response.text}")
                break
                
            data = response.json()
            issues = data.get('issues', [])
            for i in issues:
                fields = i.get('fields', {})
                assignee = fields.get('assignee') or {}
                all_issues.append({
                    "key": i.get('key'),
                    "summary": fields.get('summary'),
                    "status": fields.get('status', {}).get('name'),
                    "assignee_name": assignee.get('displayName', 'Unassigned'),
                    "assignee_account_id": assignee.get('accountId'),
                    "issue_type": fields.get('issuetype', {}).get('name'),
                    "priority": fields.get('priority', {}).get('name'),
                    "labels": fields.get('labels', [])
                })
            
            if len(issues) < max_results:
                break
            start_at += max_results
            
        return all_issues

    def get_available_transitions(self, issue_key):
        """Fetch available transitions for an issue."""
        log_step(f"Fetching transitions for {issue_key}...")
        url = f"{self.base_url}/rest/api/3/issue/{issue_key}/transitions"
        response = requests.get(url, auth=self.auth, headers=self.headers)
        if response.status_code == 200:
            return response.json().get('transitions', [])
        return []

    def transition_issue(self, issue_key, transition_id):
        """Transition an issue to a new status."""
        log_step(f"Transitioning {issue_key} with transition ID {transition_id}...")
        url = f"{self.base_url}/rest/api/3/issue/{issue_key}/transitions"
        payload = {"transition": {"id": transition_id}}
        response = requests.post(url, auth=self.auth, headers=self.headers, json=payload)
        return response.status_code == 204

def create_ticket_api(config, data):
    client = JiraAPIClient(config)
    return client.create_issue(data)

def get_sprints_api(config):
    client = JiraAPIClient(config)
    return client.get_sprints()

def get_sprint_metrics_api(config, sprint_id):
    client = JiraAPIClient(config)
    return client.get_sprint_metrics(sprint_id)

def get_assignable_users_api(config, project_key):
    client = JiraAPIClient(config)
    return client.get_assignable_users(project_key)

def get_active_sprint_api(config, board_id):
    client = JiraAPIClient(config)
    return client.get_active_sprint(board_id)

def get_tickets_for_sprint_api(config, sprint_id):
    client = JiraAPIClient(config)
    return client.get_tickets_for_sprint(sprint_id)

def get_transitions_api(config, issue_key):
    client = JiraAPIClient(config)
    return client.get_available_transitions(issue_key)

def transition_issue_api(config, issue_key, transition_id):
    client = JiraAPIClient(config)
    return client.transition_issue(issue_key, transition_id)
