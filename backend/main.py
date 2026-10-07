import os
from flask import Flask, request, jsonify
from flask_cors import CORS
from sqlalchemy import text, func
from sqlalchemy.exc import IntegrityError
from model import *



app = Flask(__name__)
CORS(app)

app.config["SQLALCHEMY_DATABASE_URI"] = 'postgresql+psycopg://neondb_owner:npg_I1qhLmxzwMD0@ep-noisy-lab-b30lxwev-pooler.c-4.ap-southeast-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require'
app.config["SQLALCHEMY_ENGINE_OPTIONS"] = {
    "pool_pre_ping": True
}

db.init_app(app)


@app.route("/")
def home():
    return "DTD_APP API is running!"
 
 
@app.route("/api/login", methods=["POST"])
def login():
 
    data = request.get_json()
 
    email = data["email"]
    password = data["password"]
 
    user = User.query.filter_by(email=email).first()
 
    if user is None:
        return jsonify({
            "success": False,
            "message": "Invalid email or password"
        })
 
    if user.password != password:
        return jsonify({
            "success": False,
            "message": "Invalid email or password"
        })
 
    return jsonify({
        "success": True,
        "message": "Login successful",
        "user_email": user.email,
        "user_id": user.id,
        "role": user.role
    })
 
 
@app.route("/api/teams", methods=["POST"])
def create_team():
    data = request.get_json()
 
    lead_email = data.get("lead")
    member_emails = [
        data.get("member1"),
        data.get("member2"),
        data.get("member3")
    ]
 
    # Remove empty members
    member_emails = [
        email for email in member_emails
        if email
    ]
 
    if not lead_email:
        return jsonify({
            "success": False,
            "message": "A team lead is required."
        }), 400
 
    # All team members
    all_emails = [lead_email] + member_emails
 
    # Check team size
    if len(all_emails) < 2 or len(all_emails) > 4:
        return jsonify({
            "success": False,
            "message": "A team must have between 2 and 4 members."
        }), 400
 
    # Check duplicate members
    if len(all_emails) != len(set(all_emails)):
        return jsonify({
            "success": False,
            "message": "A team cannot contain the same member twice."
        }), 400
 
    try:
        # CONCURRENCY FIX 1: lock the user rows for the rest of this
        # transaction. Ordered by id so two overlapping requests always lock
        # in the same order (prevents deadlocks). A concurrent request for the
        # same users waits here, then re-reads fresh data and sees
        # availability == False.
        users = (
            User.query
            .filter(User.email.in_(all_emails))
            .order_by(User.id)
            .with_for_update()
            .all()
        )
 
        if len(users) != len(all_emails):
            db.session.rollback()
            return jsonify({
                "success": False,
                "message": "One or more users could not be found."
            }), 404
 
        # Find lead
        lead = next(
            user for user in users
            if user.email == lead_email
        )
 
        # Check lead is a student
        if lead.role != "student":
            db.session.rollback()
            return jsonify({
                "success": False,
                "message": "Only students can create teams."
            }), 403
 
        # Check lead isn't already leading a team
        if lead.led_team:
            db.session.rollback()
            return jsonify({
                "success": False,
                "message": "You are already leading a team."
            }), 409
 
        # Check availability (safe now: rows are locked and freshly read)
        unavailable_users = [
            user.email
            for user in users
            if not user.availability
        ]
 
        if unavailable_users:
            db.session.rollback()
            return jsonify({
                "success": False,
                "message": "One or more users are already in a team.",
                "users": unavailable_users
            }), 409
 
        # CONCURRENCY FIX 2: team_no must be unique. Take a transaction-scoped
        # advisory lock so only one team creation allocates a number at a
        # time, and use MAX instead of COUNT (COUNT collides after deletions).
        db.session.execute(text("SELECT pg_advisory_xact_lock(727001)"))
        max_no = db.session.query(func.max(Team.team_no)).scalar() or 0
 
        team = Team(
            problem_stmt=None,
            lead_id=lead.id,
            team_no=max_no + 1
        )
 
        db.session.add(team)
        db.session.flush()
 
        # Add members
        for user in users:
            db.session.add(TeamMember(
                team_id=team.id,
                user_id=user.id
            ))
 
            # Mark user unavailable
            user.availability = False
 
        db.session.commit()
 
        return jsonify({
            "success": True,
            "message": "Team created successfully",
            "team_id": team.id,
            "team_no": team.team_no
        }), 201
 
    except IntegrityError:
        # Database constraints (unique user_id / lead_id) caught a race.
        db.session.rollback()
        return jsonify({
            "success": False,
            "message": "One or more users are already in a team."
        }), 409
 
    except Exception:
        db.session.rollback()
        return jsonify({
            "success": False,
            "message": "Failed to create team."
        }), 500
 
 
@app.route("/api/all_teams", methods=["GET"])
def get_all_teams():
    teams = Team.query.all()
    team_list = []
    for team in teams:
        members = []
        for tm in team.team_members:
            members.append({
                "email": tm.user.email,
                "role": "Lead" if tm.user.id == team.lead_id else "Member"
            })
        team_data = {
            "id": team.id,
            "team_no": team.team_no,
            "lead_id": team.lead_id,
            "members": members,
            "team_problem_stmt": team.problem_stmt
        }
        team_list.append(team_data)
    return jsonify(team_list), 200
 
 
@app.route("/api/find_teammates", methods=["GET"])
def find_teammates():
    users = User.query.filter_by(role="student", availability=True).all()
    return jsonify([{
        "name": user.name,
        "email": user.email
    } for user in users]), 200
 
 
@app.route("/api/update_problem_stmt", methods=["POST"])
def update_problem_stmt():
    data = request.get_json()
    team_id = data.get("team_id")
    problem_stmt = data.get("problem_stmt")
 
    if not team_id or not problem_stmt:
        return jsonify({
            "success": False,
            "message": "Team ID and problem statement are required."
        }), 400
 
    team = Team.query.get(team_id)
    if not team:
        return jsonify({
            "success": False,
            "message": "Team not found."
        }), 404
 
    try:
        team.problem_stmt = problem_stmt
        db.session.commit()
        return jsonify({
            "success": True,
            "message": "Problem statement updated successfully."
        }), 200
    except Exception:
        db.session.rollback()
        return jsonify({
            "success": False,
            "message": "Failed to update problem statement."
        }), 500
 
 
@app.route("/api/exit_team/<user_email>", methods=["POST"])
def exit_team(user_email):
 
    user = User.query.filter_by(email=user_email).first()
 
    if not user:
        return jsonify({
            "success": False,
            "message": "User not found."
        }), 404
 
    try:
        # Find which team this user is in (unlocked peek, just to get the id)
        membership = TeamMember.query.filter_by(user_id=user.id).first()
 
        if not membership:
            return jsonify({
                "success": False,
                "message": "You are not a member of any team."
            }), 404
 
        # CONCURRENCY FIX 3: lock the team row. Everyone exiting the same
        # team now queues up and processes one at a time.
        team = (
            Team.query
            .filter_by(id=membership.team_id)
            .with_for_update()
            .first()
        )
 
        if not team:
            # Team was deleted by someone else while we waited
            db.session.rollback()
            return jsonify({
                "success": False,
                "message": "Team not found."
            }), 404
 
        # Re-read members AFTER acquiring the lock so we see the latest state
        # (another exit may have just committed).
        members = (
            TeamMember.query
            .filter_by(team_id=team.id)
            .populate_existing()
            .all()
        )
 
        my_membership = next(
            (m for m in members if m.user_id == user.id),
            None
        )
 
        if my_membership is None:
            db.session.rollback()
            return jsonify({
                "success": False,
                "message": "You are not a member of any team."
            }), 404
 
        was_leader = team.lead_id == user.id
        remaining = [m for m in members if m.user_id != user.id]
 
        # Remove this member
        db.session.delete(my_membership)
        user.availability = True
 
        if len(remaining) < 2:
            # Too few members left: free everyone and delete the team
            for m in remaining:
                m.user.availability = True
                db.session.delete(m)
 
            db.session.delete(team)
 
        elif was_leader:
            # Promote first remaining member
            team.lead_id = remaining[0].user_id
 
        db.session.commit()
 
        return jsonify({
            "success": True,
            "message": "Successfully exited team."
        }), 200
 
    except Exception:
        db.session.rollback()
        return jsonify({
            "success": False,
            "message": "Failed to exit team."
        }), 500
 
 
if __name__ == "__main__":
    # Dev only. In production run: gunicorn -w 4 main:app
    app.run(debug=True, port=5001)
 
