# User Preferences Features

This document describes the new user preferences features implemented for the Pixzlo browser extension that provide personalized defaults for Figma frame selection and Linear issue creation.

## Overview

Two new preference systems have been added to improve user experience:

1. **Figma Frame Preferences** - Remember the last used frame per website and workspace via aggregated metadata
2. **Linear Integration Preferences** - Remember the last used team and project defaults via aggregated metadata

## Features

### 🎯 Figma Frame Tracking

**Problem Solved**: When working with multiple Figma frames for a website, users had to manually select their preferred frame each time.

**Solution**: The extension now remembers which frame was last used for each website and automatically prioritizes it in the frame selector.

#### How it works:

- When a user publishes an issue with a selected Figma frame, the preference is saved per website domain and workspace (not on mere selection)
- Next time the user visits the same website and opens the frame selector, the last used frame appears first and auto-selects
- A visual indicator shows when the currently selected frame is the preferred/last used one
- Preferences are stored per user, workspace, and website combination and fetched via a single metadata request

#### Key Files:

- `stores/figma-data.ts` - Aggregated metadata store (status, links, preferences)
- `hooks/use-figma-preferences.ts` - Hook for reading/updating Figma preference state
- `components/content/pixzlo-dialog/figma/frame-selector/figma-toolbar.tsx` - Frame selector with preference indicators and auto-selection
- `database/18_user_integration_preferences.sql` - Database schema for storing preferences
- `src/app/api/integrations/figma/metadata/route.ts` - Aggregated Figma metadata API (status, token info, links, preference)
- `src/app/api/integrations/figma/preferences/route.ts` - Preference upsert endpoint (called on issue creation)

### 🎯 Linear Integration Defaults

**Problem Solved**: Users had to manually select team, project, assignee, and workflow state for each issue creation.

**Solution**: The extension now remembers the last used options and automatically pre-selects them for new issues.

#### How it works:

- When a user creates a Linear issue with a team/project, those choices are saved as preferences (not assignee or workflow state)
- Next time the user creates an issue, the last used team/project are pre-selected
- Visual indicators show which options are using saved defaults
- Preferences are updated only when an issue is successfully created
- Preferences are stored per user and workspace combination and fetched via one metadata query

#### Key Files:

- `stores/linear-data.ts` - Aggregated Linear metadata (teams, projects, users, workflow states, preference)
- `hooks/use-dialog-linear-data.ts` - Dialog hook that preloads Linear/Figma metadata
- `components/content/pixzlo-dialog/linear-options/enhanced-category-select.tsx` - Auto-applies defaults and displays indicators
- `src/app/api/integrations/linear/metadata/route.ts` - Single endpoint returning Linear options + preference
- `src/app/api/integrations/linear/preferences/route.ts` - Preference upsert endpoint used during issue creation

## Database Schema

The preferences are stored in two new tables:

### `user_figma_preferences`

```sql
- id: UUID (primary key)
- user_id: UUID (references auth.users)
- workspace_id: UUID (references workspaces)
- website_url: TEXT (domain of the website)
- last_used_frame_id: TEXT
- last_used_frame_name: TEXT
- last_used_file_id: TEXT
- frame_url: TEXT
- frame_image_url: TEXT
- created_at/updated_at: TIMESTAMP
```

### `user_linear_preferences`

```sql
- id: UUID (primary key)
- user_id: UUID (references auth.users)
- workspace_id: UUID (references workspaces)
- last_used_team_id: TEXT
- last_used_team_name: TEXT
- last_used_project_id: TEXT
- last_used_project_name: TEXT
- last_used_assignee_id: TEXT
- last_used_assignee_name: TEXT
- last_used_workflow_state_id: TEXT
- last_used_workflow_state_name: TEXT
- created_at/updated_at: TIMESTAMP
```

## API Endpoints

### Figma Preferences

- `GET /api/integrations/figma/preferences?websiteUrl=<url>` - Get preference for a website
- `POST /api/integrations/figma/preferences` - Update/create preference

### Linear Preferences

- `GET /api/integrations/linear/preferences` - Get user's Linear preferences
- `POST /api/integrations/linear/preferences` - Update/create Linear preferences

### Figma Metadata

- `GET /api/integrations/figma/metadata?websiteUrl=<url>` - Aggregated metadata (status, token, links, preference)
- `POST /api/integrations/figma/preferences` - Update/create preference (called from issue submission flow)

### Linear Metadata

- `GET /api/integrations/linear/metadata` - Aggregated Linear options and user preference
- `POST /api/integrations/linear/preferences` - Update/create Linear team/project preference

## Usage Examples

### Using Figma Preferences in Components

```typescript
import { useFigmaPreferences } from "@/hooks/use-figma-preferences"

function MyComponent() {
  const {
    preference,
    isLoading,
    updatePreference,
    hasPreferenceForWebsite,
    refresh
  } = useFigmaPreferences()

  const handleFrameSelect = async (frameData: {
    id: string
    name: string
    fileId: string
    url: string
  }) => {
    await updatePreference({
      websiteUrl: window.location.href,
      frameId: frameData.id,
      frameName: frameData.name,
      fileId: frameData.fileId,
      frameUrl: frameData.url
    })
  }

  return (
    <div>
      <button onClick={() => void refresh()}>Refresh metadata</button>
      {hasPreferenceForWebsite(window.location.href) && (
        <p>Last used: {preference?.lastUsedFrameName}</p>
      )}
    </div>
  )
}
```

### Using Linear Preferences

```typescript
import { useLinearDataStore } from "@/stores/linear-data"

function LinearIssueForm() {
  const { metadata, fetchAllData } = useLinearDataStore()

  const defaults = metadata.preference

  const handleDialogOpen = () => {
    void fetchAllData()
  }

  const handleCreateIssue = async () => {
    // Issue submission flow automatically saves preferences via background script
  }

  return (
    <div>
      <button onClick={handleDialogOpen}>Open dialog</button>
      <p>Default team: {defaults?.lastUsedTeamName ?? "None"}</p>
      <p>Default project: {defaults?.lastUsedProjectName ?? "None"}</p>
    </div>
  )
}
```

## Background Script Integration

The background script (`background.ts`) has been enhanced with new message handlers:

- `figma-fetch-metadata` - Fetch aggregated Figma metadata (status, token info, links, preference)
- `figma-update-preference` - Update/create Figma preference (triggered on issue creation)
- `linear-fetch-metadata` - Fetch aggregated Linear options + preference
- `linear-update-preference` - Update/create Linear preference (team/project only)

## Security & Privacy

- All preferences are stored per user and workspace, ensuring data isolation
- Row Level Security (RLS) policies ensure users can only access their own preferences
- Preferences are tied to the authenticated user session
- Website URLs are normalized to domain names only (no sensitive path information stored)

## Performance Considerations

- Preferences are cached in the extension (Zustand stores) with 5-minute freshness windows
- Database queries are optimized with proper indexes and stored procedures
- Background script caching prevents redundant API requests (Linear status memoization)

## Migration Instructions

1. Run the database migration: `18_user_integration_preferences.sql`
2. Deploy the new API endpoints for preferences
3. Update the browser extension with the new preference hooks and enhanced components
4. No user action required - preferences will be automatically saved as users interact with the extension

## Visual Indicators

### Figma Frame Selector

- "🎯 Last used frame" indicator when the preferred frame is selected
- Preferred frames appear first in the frame list
- Loading indicator while preferences are being fetched

### Linear Options

- "Default" badges on options that match saved preferences
- "Using X saved defaults" indicator showing how many preferences are applied
- Auto-selection of preferred options when form loads

## Future Enhancements

Potential future improvements:

- Global preferences that apply across all workspaces
- Preference export/import functionality
- Analytics on preference usage patterns
- Team-level shared preferences
- Preference history and rollback options

## Testing

To test the features:

1. **Figma Preferences:**

   - Visit different websites (e.g., example.com, test.com)
   - Select different Figma frames for issues on each site
   - Revisit the same sites and verify the last used frame appears first and auto-selects

- Confirm refreshing metadata updates design links and preferences when needed

2. **Linear Preferences:**

- Create Linear issues with different team/project combinations
- Create a new issue and verify the last used team/project are pre-selected
- Trigger the dialog refresh and ensure metadata is fetched only once per session unless manually refreshed

## Troubleshooting

Common issues and solutions:

- **Preferences not saving**: Check browser console for API errors, ensure user is logged in
- **Preferences not loading**: Verify database migration was applied, check API endpoint accessibility
- **Wrong frame prioritized**: Clear browser cache, check that website URL is correctly detected
- **Linear defaults not applying**: Ensure Linear integration is connected, check option IDs match

For development debugging, the following debug functions are available in browser console:

- `window.__pixzlo_debug_linear` - Linear integration debugging utilities
- `window.__pixzlo_debug_figma` - Figma integration metadata debugging utilities
