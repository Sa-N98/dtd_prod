from flask_sqlalchemy import SQLAlchemy
import uuid

db = SQLAlchemy()


class User(db.Model):
    __tablename__ = "users"

    id = db.Column(
        db.Integer,
        primary_key=True,
        autoincrement=True
    )

    email = db.Column(
        db.String(255),
        unique=True,
        nullable=False
    )
    name = db.Column(
            db.String(600),
            nullable=False
        )


    password = db.Column(
        db.String(255),
        nullable=False,
        default="123"
    )

    role = db.Column(
        db.String(255),
        nullable=False
    )

    availability = db.Column(
        db.Boolean,
        nullable=False,
        default=True
    )

    # Teams where this user is a member
    team_members = db.relationship(
        "TeamMember",
        back_populates="user",
        cascade="all, delete-orphan"
    )

    # Team led by this user
    # One student can lead only one team
    led_team = db.relationship(
        "Team",
        back_populates="lead",
        uselist=False
    )


class Team(db.Model):
    __tablename__ = "teams"

    id = db.Column(
        db.Integer,
        primary_key=True,
        autoincrement=True
    )

    team_no = db.Column(
        db.Integer,
        autoincrement=True,
        nullable=False,
        unique=True
    )

    problem_stmt = db.Column(
        db.Text
    )

    # User who created/leads the team
    lead_id = db.Column(
        db.Integer,
        db.ForeignKey("users.id"),
        nullable=False,
        unique=True
    )

    lead = db.relationship(
        "User",
        back_populates="led_team"
    )

    # Members of this team
    team_members = db.relationship(
        "TeamMember",
        back_populates="team",
        cascade="all, delete-orphan"
    )


class TeamMember(db.Model):
    __tablename__ = "team_members"

    id = db.Column(
        db.Integer,
        primary_key=True,
        autoincrement=True
    )

    team_id = db.Column(
        db.Integer,
        db.ForeignKey("teams.id"),
        nullable=False
    )

    user_id = db.Column(
        db.Integer,
        db.ForeignKey("users.id"),
        nullable=False
    )

    team = db.relationship(
        "Team",
        back_populates="team_members"
    )

    user = db.relationship(
        "User",
        back_populates="team_members"
    )

    __table_args__ = (
        db.UniqueConstraint(
            "team_id",
            "user_id",
            name="unique_team_member"
        ),
    )