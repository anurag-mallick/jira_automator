import os
import json
from flask import Flask, render_template, request, jsonify, redirect, url_for
from jira_api import (
    create_ticket_api, get_sprints_api, get_sprint_metrics_api,
    get_assignable_users_api, get_active_sprint_api, get_tickets_for_sprint_api
)
    # New imports for batch transition
    , get_transitions_api, transition_issue_api
from jira_browser import create_ticket_browser

# Batch transition endpoint
@app.route('/api/batch-transition', methods=['POST'])
def api_batch_transition():
    """Batch transition tickets to a given status.
    Expected JSON payload: {"issue_keys": ["KEY-1", "KEY-2"], "transition_id": "31"}
    """
    config = load_config()
    if config.get('mode') != 'api':
        return jsonify({"success": False, "error": "API mode required"}), 400
    data = request.json or {}
    issue_keys = data.get('issue_keys', [])
    transition_id = data.get('transition_id')
    if not issue_keys or not transition_id:
        return jsonify({"success": False, "error": "issue_keys and transition_id required"}), 400
    results = []
    for key in issue_keys:
        # optional: fetch available transitions to verify
        success = transition_issue_api(config, key, transition_id)
        results.append({"key": key, "success": success})
    return jsonify({"success": True, "results": results})

app = Flask(__name__)
CONFIG_FILE = 'config.json'

def load_config():
    if not os.path.exists(CONFIG_FILE):
        return {
            "mode": "api",
            "base_url": "",
            "email": "",
            "secret": "",
            "default_project": "",
            "assignees": "",
            "board_id": ""
        }
    with open(CONFIG_FILE, 'r') as f:
        data = json.load(f)
        # Ensure default keys exist
        for key in ["mode", "base_url", "email", "secret", "default_project", "assignees", "board_id"]:
            if key not in data:
                data[key] = ""
        return data

def save_config(config_data):
    with open(CONFIG_FILE, 'w') as f:
        json.dump(config_data, f, indent=4)

@app.route('/')
def index():
    config = load_config()
    if not config.get('base_url') or not config.get('email') or not config.get('secret'):
        return redirect(url_for('config_page'))
    return render_template('index.html', default_project=config.get('default_project', ''))

@app.route('/config')
def config_page():
    return render_template('config.html', config=load_config())

@app.route('/save-config', methods=['POST'])
def save_config_route():
    data = request.json
    save_config(data)
    return jsonify({"success": True})

@app.route('/bulk')
def bulk_page():
    config = load_config()
    return render_template('bulk.html', default_project=config.get('default_project', ''))

@app.route('/dashboard')
def dashboard_page():
    config = load_config()
    return render_template('dashboard.html', board_id=config.get('board_id', ''), base_url=config.get('base_url', ''))

@app.route('/create-ticket', methods=['POST'])
def create_ticket():
    config = load_config()
    data = request.json
    
    if not data.get('summary'):
        return jsonify({"success": False, "error": "Summary is required"}), 400

    mode = config.get('mode')
    if mode == 'api':
        result = create_ticket_api(config, data)
    else:
        result = create_ticket_browser(config, data)
    
    if result.get('success'):
        print(f"\n[SUCCESS] Ticket Created: {result.get('ticket_id')}")
    
    return jsonify(result)

@app.route('/create-bulk', methods=['POST'])
def create_bulk():
    config = load_config()
    data = request.json
    tickets = data.get('tickets', [])
    
    if not tickets:
        return jsonify({"success": False, "error": "No tickets provided"}), 400

    if config.get('mode') != 'api':
        return jsonify({"success": False, "error": "Bulk creation is only supported in API mode."}), 400
    
    results = []
    for ticket in tickets:
        res = create_ticket_api(config, ticket)
        results.append({
            "summary": ticket.get('summary'),
            "result": res
        })
    
    return jsonify({"success": True, "results": results})

@app.route('/api/sprints', methods=['GET'])
def api_sprints():
    config = load_config()
    if config.get('mode') != 'api':
        return jsonify({"success": False, "error": "Dashboard metrics are only available in API mode"}), 400
    
    sprints = get_sprints_api(config)
    return jsonify({"success": True, "sprints": sprints})

@app.route('/api/metrics/<sprint_id>', methods=['GET'])
def api_metrics(sprint_id):
    config = load_config()
    if config.get('mode') != 'api':
        return jsonify({"success": False, "error": "Dashboard metrics are only available in API mode"}), 400
    
    metrics = get_sprint_metrics_api(config, sprint_id)
    return jsonify(metrics)

@app.route('/api/assignees', methods=['GET'])
def api_assignees():
    config = load_config()
    project_key = request.args.get('project')
    
    if config.get('mode') != 'api':
        # Fallback to manual config
        assignees = [a.strip() for a in config.get('assignees', '').split('\n') if a.strip()]
        return jsonify([{"displayName": a, "accountId": None} for a in assignees])
    
    users = get_assignable_users_api(config, project_key)
    if not users:
        # Fallback to manual config if API fails
        assignees = [a.strip() for a in config.get('assignees', '').split('\n') if a.strip()]
        return jsonify([{"displayName": a, "accountId": None} for a in assignees])
        
    return jsonify(users)

@app.route('/api/active-sprint', methods=['GET'])
def api_active_sprint():
    config = load_config()
    board_id = request.args.get('board_id') or config.get('board_id')
    
    if not board_id:
        return jsonify({"success": False, "error": "Board ID not configured"}), 400

    if config.get('mode') != 'api':
        return jsonify({"success": False, "error": "API mode required"}), 400
        
    sprint = get_active_sprint_api(config, board_id)
    if sprint:
        return jsonify({"success": True, "sprint": sprint})
    return jsonify({"success": False, "error": "No active sprint found"}), 404

@app.route('/api/sprint-tickets', methods=['GET'])
def api_sprint_tickets():
    config = load_config()
    sprint_id = request.args.get('sprint_id')
    
    if not sprint_id:
        return jsonify({"success": False, "error": "Sprint ID is required"}), 400

    if config.get('mode') != 'api':
        return jsonify({"success": False, "error": "API mode required"}), 400
        
    tickets = get_tickets_for_sprint_api(config, sprint_id)
    return jsonify({"success": True, "tickets": tickets})

if __name__ == '__main__':
    print("\nStarting Jira Ticket Creator...")
    print("Web UI available at http://localhost:5000")
    app.run(debug=True, port=5000)
