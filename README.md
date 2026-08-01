# Neighborhood Hub

IMPLEMENTATION AND PROJECT-MANAGEMENT METHOD

Treat this prompt as the complete product brief for a disciplined V1 MVP.

Begin by inspecting the existing repository, database, routes, dependencies, styling system, reusable components, authentication state, and any partially implemented features. Preserve sound existing work wherever possible.

After inspection, create a comprehensive implementation plan for the complete V1 described in this brief.

The plan should be organized into sequential implementation waves. Each wave should contain several concrete steps that Lovable can execute in order.

You have discretion over the exact number of waves and steps, but the dependency order should approximately follow:

Product foundation and public neighborhood experience

Authentication and lightweight profiles

Shared post infrastructure and module-specific publishing

Participation, saves, and post-scoped responses

Directory contribution and moderation

Neighborhood Store and order infrastructure

NFC access points, analytics, hardening, and launch readiness

Do not treat these headings as seven isolated feature requests. Convert them into a coherent implementation plan based on the actual repository.

For every wave, identify:

The user-facing outcome

Database migrations

Types and validation

Row Level Security policies

Routes

Components

Queries and mutations

Storage requirements

Edge Functions or scheduled jobs

Seed or migration data

Loading, empty, error, and permission states

Responsive behavior

Accessibility requirements

Test scenarios

Explicitly deferred functionality

Then implement the plan sequentially.

Each wave may contain multiple implementation steps. Complete those steps in a logical dependency order rather than attempting to generate the entire product in one undifferentiated change.

Do not stop after producing the plan unless there is a genuine technical blocker that cannot be resolved from the repository or this brief. The plan is the beginning of the implementation process, not the final deliverable.

IMPLEMENTATION DISCIPLINE

Keep the application functional at the end of every wave.

A later wave must build on the established architecture rather than replace or duplicate it.

Before creating a new abstraction, component, table, package, or service, determine whether the current project already provides an appropriate primitive.

Prefer:

Small composable components

Clear relational data models

Shared post infrastructure

Type-specific forms

Explicit database constraints

Narrow permissions

Reusable query hooks

Predictable state transitions

Understandable chronological ordering

Progressive enhancement

Avoid:

Premature abstraction

Parallel implementations of the same concept

Giant multipurpose components

Unstructured JSON for relational product data

Client-side security assumptions

Feature flags for functionality not planned for V1

Placeholder buttons with no working behavior

Mock data remaining in production paths

Duplicate mobile and desktop business logic

New packages when the current stack can perform the task

When a feature is intentionally excluded from V1, do not create a nonfunctional preview of it. Leave the architecture capable of supporting it later without exposing unfinished controls.

WAVE COMPLETION GATES

At the end of each wave:

Run the relevant migrations safely.

Verify Row Level Security for anonymous users, authenticated users, content owners, non-owners, blocked users, and administrators where applicable.

Test the primary workflow in the browser.

Test mobile and desktop layouts.

Check loading, empty, error, expired, removed, and unauthorized states.

Check keyboard access and visible focus treatment.

Check for horizontal overflow and broken long-content layouts.

Resolve TypeScript, build, runtime, and console errors.

Remove temporary implementation artifacts.

Confirm that the next wave can build on the completed work without rearchitecture.

Do not declare a wave complete merely because the interface renders. Its primary user workflow must work with real persisted data and the intended permissions.

PRODUCT PRIORITY ORDER

When implementation tradeoffs are required, prioritize in this order:

Data integrity and privacy

A complete primary user journey

Mobile usability

Clear neighborhood context

Moderation and user control

Accessibility

Visual refinement

Secondary convenience features

Future extensibility

Do not sacrifice foundational correctness to add more visible features.

V1 COMPLETION STANDARD

The V1 is complete when a visitor can:

Open a neighborhood URL without an account

Understand what is happening in that neighborhood

Browse Plans, Marketplace, Volunteer, Directory, and Store

Open public post, place, product, and profile details

Arrive through an NFC or QR access-point URL

A signed-in member can:

Complete a lightweight profile

Save a neighborhood

Create, edit, complete, renew, and remove supported post types

Upload appropriate post images

Join or express interest in a Plan

Respond to a Marketplace or Volunteer post through a post-scoped private conversation

Save posts and places

Submit a Directory addition or correction

Report content

Block another user

View and manage their own activity

Purchase merchandise and view their order history

An administrator can:

Review reports

Remove or restore content

Review Directory submissions

Manage neighborhoods

Manage products and variants

Review orders and fulfillment states

Create and update NFC access points

View basic privacy-conscious scan counts

The application must also include:

Automatic content expiration

Secure server-side payment handling

Webhook-confirmed orders

Appropriate legal and community-policy pages

Responsive mobile and desktop behavior

Accessible interactions

Search-friendly public metadata

Clear loading, empty, error, removed, and expired states

NON-GOALS FOR THIS BUILD

Do not implement:

Business accounts

Business pages

Menus

Business commissions

Open merchant storefronts

Artist payout infrastructure

Neighbor-to-neighbor payments

Shipping between neighbors

Bidding or Marketplace offers

Reviews or star ratings

Followers or friend counts

Public popularity metrics

General direct messaging

Read receipts

Group chat

Groups

Advertising

Paid post boosts

Algorithmic engagement ranking

Native iOS or Android applications

Complex geospatial discovery

Multiple-city administration beyond what is minimally necessary for a sound data model

FINAL VERIFICATION

Once all planned waves are implemented, perform a complete V1 audit rather than reviewing only the final wave.

Test the product from these perspectives:

Anonymous neighborhood visitor

New account creating a profile

Returning neighborhood member

Marketplace seller

Marketplace respondent

Plan host

Plan participant

Volunteer organizer

Volunteer respondent

Directory contributor

Store customer

Blocked user

Content owner

Administrator

NFC visitor arriving without prior context

Verify the full path from discovery to participation, not merely individual screens.

Conclude with:

A summary of the implementation plan actually completed

Database migrations added

Routes and major components added or changed

Security and RLS decisions

Server functions and scheduled jobs

Tests performed

Known limitations

V1 features deliberately deferred

Recommended priorities after launch

The finished result should be a cohesive, polished 2027-quality neighborhood product—not a collection of loosely connected generated features.

This project was built with [Lovable](https://lovable.dev).

**Live app**: https://nearby-nexus-base.lovable.app

## Build with Lovable

Continue developing this project in the [Lovable editor](https://lovable.dev/projects/df4566fc-a30d-414f-86b5-24e9b62ace91).

- **Ship faster**: describe what you want to build and Lovable handles the code.
- **Stay in sync**: every change made in Lovable is committed straight to this repository.
- **Full ownership**: this code is yours. Push to `main` on GitHub and your changes sync back into Lovable, ready for your next prompt.

## Development

Prefer working locally? You need Node.js and npm — [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating).

```sh
git clone <this-repository-url>
cd <repository-name>
npm i
npm run dev
```
