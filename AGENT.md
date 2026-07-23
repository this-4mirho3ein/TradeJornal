# AGENTS.md

# Trade Journal
Professional Trading Journal for MetaTrader 4

Version 1.0

---

# Project Philosophy

This project is NOT just another CRUD application.

The goal is to build a professional trading journal platform that can eventually compete with:

- TradeZella
- Edgewonk
- TraderSync
- Tradervue

Everything should therefore be designed for long-term scalability.

Never write code that only solves today's problem.

Always build code that supports future expansion.

Code quality is more important than development speed.

---

# Tech Stack

Frontend

- Next.js 16 App Router
- React 19
- TypeScript Strict
- Tailwind CSS v4
- Shadcn UI
- TanStack Query
- React Hook Form
- Zod
- Zustand
- Framer Motion
- Recharts
- React Dropzone
- React Virtuoso

Backend

- Python 3.12+
- Flask
- SQLAlchemy
- Alembic
- SQLite (initially)
- PostgreSQL ready
- Marshmallow
- Pydantic
- APScheduler
- MetaTrader Python Package

Database

SQLite

Future

PostgreSQL

Caching

Redis (future)

Authentication

JWT

Images

Local Storage initially

Future:
S3 / Cloudflare R2

---

# Architecture

Use Clean Architecture.

Presentation

↓

API Layer

↓

Application Layer

↓

Domain Layer

↓

Infrastructure Layer

Never allow Flask routes to communicate directly with SQLAlchemy.

Everything must pass through Services.

---

# Folder Structure

backend/

app/

api/

controllers/

schemas/

services/

repositories/

models/

database/

core/

events/

tasks/

utils/

config/

frontend/

src/

app/

components/

features/

hooks/

services/

store/

types/

schemas/

lib/

styles/

---

# Coding Principles

SOLID

DRY

KISS

YAGNI

Dependency Injection

Repository Pattern

Service Layer

DTO Pattern

Domain Models

Never mix business logic inside routes.

Never place SQL inside controllers.

Never access the database from the frontend.

---

# Future Scalability

Design every module so it can later become a microservice.

Possible future services:

Authentication Service

Trading Service

Journal Service

Screenshot Service

Analytics Service

Notification Service

AI Analysis Service

Reporting Service

Broker Integration Service

Each service should communicate through events.

---

# Database Design

Users

Trading Accounts

Trades

Trade Images

Trade Notes

Strategies

Trade Tags

Trade Sessions

Trade Reviews

Trade Psychology

Trade Metrics

Trade Mistakes

Trade Attachments

Import Jobs

Synchronization Logs

Notifications

Settings

---

# Trades Table

A trade should NEVER only store MT4 information.

It must also store journal information.

Trade

ticket

symbol

type

volume

open_price

close_price

stop_loss

take_profit

commission

swap

profit

balance_after_trade

equity_after_trade

magic_number

comment

open_time

close_time

duration

broker

server

account_number

Journal

strategy_id

session_id

rating

mistake

lesson

emotion

confidence

entry_reason

exit_reason

notes

image

created_at

updated_at

---

# Strategies

A trade belongs to one strategy.

Examples

London Breakout

SP2L

Pro BTB

Liquidity Sweep

News

Scalping

Swing

The strategy table must be editable.

Users should create unlimited strategies.

---

# Trade Images

Every trade can contain multiple screenshots.

Examples

Before Entry

During Trade

Exit

Analysis

Mobile Screenshot

Images must never be stored inside SQLite.

Only the path should be stored.

Future migration to cloud storage must require zero code changes.

---

# Synchronization

Create a dedicated Sync Service.

Never mix synchronization with API endpoints.

Synchronization responsibilities

Connect to MT4

Read Account

Read Balance

Read Equity

ReadMargin

Read Open Positions

Read Closed Trades

Compare with database

Insert only new trades

Update changed trades

Log synchronization

Retry failures

---

# Sync Strategy

Never delete trades.

Use UPSERT.

Ticket Number must be unique.

Every synchronization should be idempotent.

Running sync 1000 times must never duplicate data.

---

# Import Flow

User connects MT4

↓

Sync Service

↓

Read Account

↓

Read History

↓

Normalize Data

↓

Repository

↓

SQLite

↓

Analytics

↓

Frontend

---

# MetaTrader Layer

Never call MetaTrader directly from controllers.

Create

MT4Client

Inside Infrastructure.

Only MT4Client communicates with MetaTrader.

Services only communicate with MT4Client.

---

# Repository Pattern

TradeRepository

AccountRepository

StrategyRepository

ImageRepository

SessionRepository

JournalRepository

Never expose SQLAlchemy Models outside repositories.

---

# API Design

REST

/api/auth

/api/accounts

/api/trades

/api/strategies

/api/images

/api/dashboard

/api/reports

/api/settings

/api/sync

Version all APIs.

Example

/api/v1/trades

---

# Background Jobs

Use APScheduler.

Jobs

Sync every minute

Generate analytics

Cleanup images

Backup database

Refresh statistics

---

# Logging

Structured Logging

Never use print()

Use logging module.

Log

Errors

Warnings

Sync duration

API duration

Exceptions

User actions

---

# Error Handling

Never swallow exceptions.

Return standardized JSON.

{
  success,
  message,
  data,
  error
}

---

# Validation

All requests

Pydantic

Frontend

Zod

Never trust frontend validation.

---

# Authentication

JWT

Access Token

Refresh Token

Route Guards

Future

OAuth

Google Login

GitHub Login

---

# Frontend Principles

Feature Based Architecture

Example

features/

dashboard/

journal/

trade/

analytics/

settings/

authentication/

Each feature owns

components

hooks

api

types

schemas

---

# UI

Professional

Minimal

Trading Terminal Inspired

Large whitespace

Rounded cards

Smooth animations

Fast loading

Dark mode

Light mode

Responsive

Desktop First

---

# Dashboard

Account Summary

Balance

Equity

Drawdown

Profit

Win Rate

Average RR

Today's Trades

Weekly Performance

Monthly Performance

Calendar

Recent Trades

Charts

---

# Journal

Professional Data Grid

Columns

Ticket

Symbol

Strategy

RR

Profit

Win/Loss

Duration

Screenshot

Emotion

Rating

Tags

Notes

Search

Filters

Sorting

Pagination

---

# Analytics

Win Rate

Average RR

Profit Factor

Expectancy

Average Winner

Average Loser

Best Strategy

Worst Strategy

Performance by Hour

Performance by Weekday

Performance by Month

Performance by Symbol

Performance by Strategy

Performance by Session

---

# Future AI

Trade Review

Pattern Recognition

Mistake Detection

Journal Summary

Automatic Strategy Classification

Natural Language Search

Trade Recommendations

---

# Code Style

Small Functions

Single Responsibility

Strong Typing

Meaningful Names

No Magic Numbers

No Hardcoded Strings

Reusable Components

No duplicated logic

---

# Git

Feature Branches

Pull Requests

Conventional Commits

Examples

feat:

fix:

refactor:

docs:

test:

perf:

---

# Testing

pytest

Repository Tests

Service Tests

API Tests

Frontend

Vitest

Playwright

Coverage above 80%

---

# Performance

Pagination

Lazy Loading

Virtualized Tables

Memoization

Server Components

Streaming

Image Optimization

Database Indexes

---

# Security

Parameterized Queries

JWT Validation

Rate Limiting

Input Sanitization

CORS

CSRF protection where applicable

Secure Headers

Environment Variables

Never expose secrets.

---

# Documentation

Every Service

Every Repository

Every API

Every Model

Must include docstrings.

Complex algorithms require documentation.

---

# Definition of Done

A feature is complete only when:

✓ Tested

✓ Typed

✓ Documented

✓ Responsive

✓ Accessible

✓ Logged

✓ Error Handled

✓ Clean Architecture compliant

✓ No duplicated code

✓ Production Ready

---

# Cursor Rules

Never generate temporary code.

Never use any.

Never disable TypeScript strict mode.

Never create giant components.

Never place business logic inside React components.

Never write SQL inside Flask routes.

Always prefer composition over inheritance.

Always create reusable modules.

Always optimize for maintainability instead of speed.

Think like a senior software engineer with responsibility for a codebase expected to live for at least five years.