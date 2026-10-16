# Third-time report access

Intended access for **Reportes → 3er Tiempo** (`/reports/third-time`). Edit this file when a role should see more or less. The screen does not apply these rules yet.

## Rules

| Role | Label | Opens the report | Categories | Charts and player list |
| --- | --- | --- | --- | --- |
| `ADMINISTRATOR` | Administrador | Yes | Every category | Every player in the selected category |
| `COORDINATOR` | Coordinador | Yes | Every category | Every player in the selected category |
| `COLLABORATOR` | Colaborador | Yes | Only assigned categories | Only players in those categories |
| `PLAYER` | Jugadora | Yes | Only categories where she has fees | Only her own fees |
| `PARENT` | Familia | No | — | — |
| `VISITOR` | Visitante | No | — | — |

Year and month filters stay available for every role that can open the report. They do not widen the rows above.

## Administrator and coordinator

The category filter lists every category. Both charts and the player list include every player in the selected category, with totals for that full set.

## Collaborator

Assigned categories are the `categoryCode` values on collaborator records linked to the signed-in user (`Collaborator.userId`). Each record stores one optional category. A collaborator with no category sees the report with an empty category list and no player or fee data.

Categories outside that set stay out of the filter, the charts, the list, and the totals. Choosing one in the address bar does not reveal it.

## Player

The player is the roster row whose `Player.userId` is the signed-in user. A user with no roster row sees the report empty.

Charts and the list include only her third-time fees. Other players' names, amounts, statuses, and totals stay hidden. The status chart counts only her fees. Expected amount is the category rate for one player. Collected amount is what she paid.

If she has fees in more than one category, the category filter lists those categories and each view still shows only her row.

## Family and visitor

They do not get the menu item, and a direct visit to `/reports/third-time` does not show the report. Change their row in the table when that should stop being true.

## Current screen

`requireAccess("register-movements")` in `src/app/(protected)/reports/third-time/page.tsx` still guards the page. The same capability shows the menu link in `src/lib/club-navigation.ts`. That lets an administrator, a coordinator, and a collaborator open every category. A player, a family user, and a visitor do not see the item. Editing this file does not change that behavior.
