from flask import Blueprint, render_template, redirect, url_for
from .models import settings as settings_model

views_bp = Blueprint('views', __name__)


@views_bp.get('/')
@views_bp.get('/dashboard')
def index():
    if settings_model.get('setup_done', '0') != '1':
        return redirect(url_for('views.setup'))
    return render_template('dashboard.html')


@views_bp.get('/setup')
def setup():
    return render_template('setup.html')


@views_bp.get('/projects')
def projects():
    return render_template('projects.html')


@views_bp.get('/session')
def session():
    return render_template('session.html')


@views_bp.get('/data-explorer')
def data_explorer():
    return render_template('data_explorer.html')


@views_bp.get('/control')
def control():
    return render_template('control.html')


@views_bp.get('/automation')
def automation():
    return render_template('automation.html')


@views_bp.get('/settings')
def settings():
    return render_template('setup.html')
