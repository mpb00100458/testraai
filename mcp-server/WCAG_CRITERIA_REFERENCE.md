# WCAG 2.1/2.2 Success Criteria Reference

This is a comprehensive reference of WCAG success criteria used by the Accessibility Testing MCP Server.

## Perceivable (Principle 1)

### 1.1 Text Alternatives
Provide text alternatives for non-text content

#### 1.1.1 Non-text Content (Level A)
- **Rule IDs:** `image-alt`, `input-image-alt`, `object-alt`, `area-alt`
- **Description:** All non-text content must have a text alternative
- **Requirements:** 
  - Images: Use `alt` attribute with meaningful description
  - Decorative images: Use `alt=""` (empty)
  - Form image buttons: Provide descriptive alt text
  - Image maps: Provide alt text for area elements
- **Common Failures:**
  - Missing alt attributes on `<img>` tags
  - Empty alt on informative images
  - Generic alt text like "image" or "photo"

---

### 1.2 Time-based Media
Provide alternatives for time-based media

#### 1.2.1 Audio-only and Video-only (Level A)
- **Rule IDs:** `audio-caption`, `video-caption`
- **Description:** Pre-recorded audio/video needs text alternatives
- **Requirements:**
  - Audio-only: Provide transcript
  - Video-only: Provide audio description or transcript

#### 1.2.2 Captions (Level A)
- **Rule IDs:** `video-caption`
- **Description:** Captions for pre-recorded audio in synchronized media
- **Requirements:** Provide synchronized captions for all video content

#### 1.2.3 Audio Description or Media Alternative (Level A)
- **Rule IDs:** `audio-description`
- **Description:** Provide audio description for pre-recorded video
- **Requirements:** Include narration of visual-only content

#### 1.2.4 Captions (Live) (Level AA)
- **Description:** Live audio content needs captions
- **Requirements:** Real-time captions for live video/audio broadcasts

#### 1.2.5 Audio Description (Level AA)
- **Description:** Audio description for all pre-recorded video
- **Requirements:** Comprehensive narration of visual content

---

### 1.3 Adaptable
Create content that can be presented in different ways

#### 1.3.1 Info and Relationships (Level A)
- **Rule IDs:** `label`, `form-field-multiple-labels`, `landmark-one-main`, `list`, `listitem`, `definition-list`, `dlitem`, `table-duplicate-name`, `td-headers-attr`, `th-has-data-cells`
- **Description:** Information, structure, and relationships must be programmatically determinable
- **Requirements:**
  - Form inputs have associated labels
  - Headings are properly nested (h1→h2→h3)
  - Lists use proper markup (`<ul>`, `<ol>`, `<li>`)
  - Tables use `<th>`, proper headers, and captions
  - Landmarks clearly define page regions
- **Common Failures:**
  - Form inputs without labels
  - Using `<div>` instead of semantic HTML
  - Skipping heading levels (h1→h3)
  - Layout tables without proper structure

#### 1.3.2 Meaningful Sequence (Level A)
- **Rule IDs:** `tabindex`, `focus-order-semantics`
- **Description:** Content order must be meaningful
- **Requirements:**
  - Reading order matches visual order
  - Tab order is logical
  - No positive tabindex values

#### 1.3.3 Sensory Characteristics (Level A)
- **Description:** Instructions don't rely solely on sensory characteristics
- **Requirements:** Don't use only shape, size, location, or sound
- **Example:** ❌ "Click the green button" → ✅ "Click the Submit button (green)"

#### 1.3.4 Orientation (Level AA) - WCAG 2.1
- **Rule IDs:** `css-orientation-lock`
- **Description:** Content works in both portrait and landscape
- **Requirements:** Don't restrict to single orientation unless essential

#### 1.3.5 Identify Input Purpose (Level AA) - WCAG 2.1
- **Rule IDs:** `autocomplete-valid`
- **Description:** Input fields collecting user info have autocomplete attribute
- **Requirements:** Use autocomplete for name, email, phone, address, etc.

---

### 1.4 Distinguishable
Make it easier for users to see and hear content

#### 1.4.1 Use of Color (Level A)
- **Rule IDs:** `link-in-text-block`
- **Description:** Color is not the only visual means of conveying information
- **Requirements:**
  - Links must be distinguishable by more than color alone
  - Use underlines, icons, or sufficient contrast difference
- **Example:** Form errors shown in red must also have an icon or text indicator

#### 1.4.2 Audio Control (Level A)
- **Description:** Audio that plays automatically can be paused/stopped
- **Requirements:** Provide controls for auto-playing audio

#### 1.4.3 Contrast (Minimum) (Level AA)
- **Rule IDs:** `color-contrast`
- **Description:** Text has sufficient contrast against background
- **Requirements:**
  - Normal text: **4.5:1** contrast ratio
  - Large text (18pt+): **3:1** contrast ratio
  - Applies to text and images of text
- **Common Failures:**
  - Light gray text on white (#999 on #FFF = 2.8:1 ❌)
  - White text on light backgrounds
  - Placeholder text with insufficient contrast
- **Tools:** Chrome DevTools, WebAIM Contrast Checker

#### 1.4.4 Resize Text (Level AA)
- **Rule IDs:** `meta-viewport-large`
- **Description:** Text can be resized up to 200% without loss of content
- **Requirements:**
  - Don't use `user-scalable=no` in viewport meta tag
  - Content reflows properly at 200% zoom
  - No horizontal scrolling required

#### 1.4.5 Images of Text (Level AA)
- **Description:** Use real text instead of images of text
- **Requirements:** Only use images of text when essential (logos, etc.)

#### 1.4.10 Reflow (Level AA) - WCAG 2.1
- **Description:** Content reflows without horizontal scrolling at 320px width
- **Requirements:**
  - Responsive design that adapts to small screens
  - No horizontal scrolling at 400% zoom

#### 1.4.11 Non-text Contrast (Level AA) - WCAG 2.1
- **Rule IDs:** `color-contrast-enhanced`
- **Description:** UI components and graphics have 3:1 contrast
- **Requirements:**
  - Interactive elements visible against backgrounds
  - Icons, form controls, focus indicators have 3:1 contrast

#### 1.4.12 Text Spacing (Level AA) - WCAG 2.1
- **Description:** Content adapts to increased text spacing
- **Requirements:** No loss of content when spacing is increased

#### 1.4.13 Content on Hover or Focus (Level AA) - WCAG 2.1
- **Rule IDs:** `tooltip-hover-focusable`
- **Description:** Content appearing on hover/focus is dismissible and hoverable
- **Requirements:**
  - Can be dismissed without moving pointer/focus
  - Pointer can move over the new content
  - Remains visible until dismissed or no longer relevant

---

## Operable (Principle 2)

### 2.1 Keyboard Accessible
Make all functionality available from a keyboard

#### 2.1.1 Keyboard (Level A)
- **Rule IDs:** `button`, `link`, `interactive-controls-keyboard`
- **Description:** All functionality available via keyboard
- **Requirements:**
  - All interactive elements keyboard accessible
  - No keyboard traps
  - Custom controls respond to keyboard
- **Common Failures:**
  - `<div onclick>` without keyboard handler
  - Custom dropdowns not keyboard operable

#### 2.1.2 No Keyboard Trap (Level A)
- **Rule IDs:** `keyboard-trap`
- **Description:** Keyboard focus can move away from any component
- **Requirements:** Tab/Shift+Tab always works to escape

#### 2.1.4 Character Key Shortcuts (Level A) - WCAG 2.1
- **Description:** Single character shortcuts can be turned off or remapped
- **Requirements:** Avoid conflicts with screen reader shortcuts

---

### 2.2 Enough Time
Provide users enough time to read and use content

#### 2.2.1 Timing Adjustable (Level A)
- **Description:** Time limits can be turned off, adjusted, or extended
- **Requirements:** Warn before timeout, allow extension

#### 2.2.2 Pause, Stop, Hide (Level A)
- **Description:** Moving, blinking, or auto-updating content can be paused
- **Requirements:** Provide controls for carousels, animations

---

### 2.3 Seizures and Physical Reactions
Do not design content that causes seizures

#### 2.3.1 Three Flashes or Below Threshold (Level A)
- **Description:** No content flashes more than 3 times per second
- **Requirements:** Avoid rapid flashing content

---

### 2.4 Navigable
Provide ways to help users navigate and find content

#### 2.4.1 Bypass Blocks (Level A)
- **Rule IDs:** `bypass`, `skip-link`
- **Description:** Mechanism to skip repeated content
- **Requirements:**
  - "Skip to main content" links
  - Proper heading structure
  - ARIA landmarks

#### 2.4.2 Page Titled (Level A)
- **Rule IDs:** `document-title`
- **Description:** Web pages have descriptive titles
- **Requirements:**
  - Every page has unique `<title>`
  - Title describes page purpose

#### 2.4.3 Focus Order (Level A)
- **Rule IDs:** `tabindex`, `focus-order`
- **Description:** Focusable elements receive focus in meaningful order
- **Requirements:**
  - Tab order matches visual order
  - No positive tabindex values

#### 2.4.4 Link Purpose (In Context) (Level A)
- **Rule IDs:** `link-name`
- **Description:** Purpose of each link is determined from link text
- **Requirements:**
  - Avoid "click here" or "read more" alone
  - Links describe destination
- **Example:** ❌ "Click here" → ✅ "Download annual report (PDF)"

#### 2.4.5 Multiple Ways (Level AA)
- **Description:** More than one way to locate pages
- **Requirements:** Search, sitemap, navigation menu, etc.

#### 2.4.6 Headings and Labels (Level AA)
- **Rule IDs:** `heading-order`, `empty-heading`, `p-as-heading`
- **Description:** Headings and labels describe topic or purpose
- **Requirements:**
  - Descriptive headings
  - Proper heading hierarchy (no skipping levels)
  - Labels clearly describe form inputs

#### 2.4.7 Focus Visible (Level AA)
- **Rule IDs:** `focus-visible`
- **Description:** Keyboard focus indicator is visible
- **Requirements:**
  - Don't remove focus outlines with `outline: none`
  - Provide custom focus indicators if removing default

---

### 2.5 Input Modalities - WCAG 2.1
Make it easier for users to operate functionality

#### 2.5.1 Pointer Gestures (Level A)
- **Description:** Functionality using multipoint/path-based gestures has alternatives
- **Requirements:** Provide single-pointer alternatives

#### 2.5.2 Pointer Cancellation (Level A)
- **Description:** Actions execute on up-event, not down-event
- **Requirements:** Click/tap completes on release, not press

#### 2.5.3 Label in Name (Level A)
- **Rule IDs:** `label-content-name-mismatch`
- **Description:** Visible label text is part of accessible name
- **Requirements:** Button text matches aria-label

#### 2.5.4 Motion Actuation (Level A)
- **Description:** Functionality triggered by device motion can be disabled
- **Requirements:** Provide alternative input methods

---

## Understandable (Principle 3)

### 3.1 Readable
Make text content readable and understandable

#### 3.1.1 Language of Page (Level A)
- **Rule IDs:** `html-has-lang`, `html-lang-valid`
- **Description:** Default language of page is programmatically determined
- **Requirements:**
  - `<html lang="en">` attribute present
  - Valid language code (ISO 639-1)

#### 3.1.2 Language of Parts (Level AA)
- **Rule IDs:** `lang-valid`
- **Description:** Language of page sections can be determined
- **Requirements:** Use `lang` attribute for content in different languages

---

### 3.2 Predictable
Make web pages appear and operate in predictable ways

#### 3.2.1 On Focus (Level A)
- **Description:** Focus doesn't trigger unexpected context changes
- **Requirements:** No automatic form submission on focus

#### 3.2.2 On Input (Level A)
- **Description:** Changing settings doesn't cause unexpected context changes
- **Requirements:** Warn before automatic actions

#### 3.2.3 Consistent Navigation (Level AA)
- **Rule IDs:** `identical-links-same-purpose`
- **Description:** Navigation mechanisms are consistent across pages
- **Requirements:** Same order, same location for repeated navigation

#### 3.2.4 Consistent Identification (Level AA)
- **Description:** Components with same functionality are identified consistently
- **Requirements:** Same icons, labels for same functions across site

---

### 3.3 Input Assistance
Help users avoid and correct mistakes

#### 3.3.1 Error Identification (Level A)
- **Rule IDs:** `aria-input-field-name`
- **Description:** Errors are identified and described to user
- **Requirements:**
  - Clear error messages
  - Indicate which field has error
  - Describe the error

#### 3.3.2 Labels or Instructions (Level A)
- **Rule IDs:** `label`, `label-title-only`
- **Description:** Labels or instructions provided for user input
- **Requirements:**
  - Every form field has label
  - Required fields clearly marked
  - Format requirements explained

#### 3.3.3 Error Suggestion (Level AA)
- **Description:** Error messages suggest corrections when possible
- **Requirements:** Provide guidance on how to fix errors

#### 3.3.4 Error Prevention (Legal, Financial, Data) (Level AA)
- **Description:** Submissions can be reviewed, corrected, or reversed
- **Requirements:**
  - Confirmation step before final submission
  - Ability to review and edit data
  - Undo mechanism for irreversible actions

---

## Robust (Principle 4)

### 4.1 Compatible
Maximize compatibility with current and future tools

#### 4.1.1 Parsing (Level A)
- **Rule IDs:** `duplicate-id`, `duplicate-id-active`, `duplicate-id-aria`
- **Description:** HTML is well-formed
- **Requirements:**
  - No duplicate IDs
  - Properly nested elements
  - Valid HTML

#### 4.1.2 Name, Role, Value (Level A)
- **Rule IDs:** `button-name`, `link-name`, `aria-required-attr`, `aria-roles`, `aria-valid-attr`, `aria-valid-attr-value`, `aria-hidden-focus`
- **Description:** UI components have accessible names, roles, states
- **Requirements:**
  - All interactive elements have accessible names
  - ARIA roles used correctly
  - ARIA attributes have valid values
  - Interactive elements not hidden from screen readers
- **Common Failures:**
  - `<button>` with no text or aria-label
  - `<a href="#">` with no text
  - `aria-hidden="true"` on focusable elements
  - Invalid ARIA attributes

#### 4.1.3 Status Messages (Level AA) - WCAG 2.1
- **Rule IDs:** `aria-live`, `status`
- **Description:** Status messages can be programmatically determined
- **Requirements:**
  - Use `role="status"`, `role="alert"`, or `aria-live`
  - Don't require focus to perceive messages

---

## Common axe-core Rule IDs

### Critical Rules
- `color-contrast` - Text contrast insufficient
- `image-alt` - Images missing alt text
- `label` - Form fields missing labels
- `button-name` - Buttons without accessible names
- `link-name` - Links without accessible names
- `aria-required-attr` - Missing required ARIA attributes
- `html-has-lang` - HTML missing lang attribute

### Serious Rules
- `aria-valid-attr-value` - Invalid ARIA attribute values
- `aria-roles` - Invalid ARIA roles
- `duplicate-id` - Duplicate IDs in page
- `heading-order` - Incorrect heading hierarchy
- `bypass` - No skip navigation link
- `document-title` - Missing or empty page title
- `focus-visible` - Focus indicator not visible

### Moderate Rules
- `aria-allowed-attr` - ARIA attributes not allowed for role
- `region` - Content not in landmark
- `landmark-one-main` - Page missing main landmark
- `list` - Lists not properly marked up
- `meta-viewport` - Restrictive viewport settings

### Minor Rules
- `empty-heading` - Headings with no content
- `p-as-heading` - Paragraphs styled as headings
- `label-title-only` - Form fields only have title attribute

---

## WCAG 2.2 New Success Criteria (2023)

### 2.4.11 Focus Not Obscured (Minimum) (Level AA)
- **Description:** Focused elements are not entirely hidden by other content
- **Requirements:** At least part of focus indicator visible when element receives focus

### 2.4.12 Focus Not Obscured (Enhanced) (Level AAA)
- **Description:** Focused elements are fully visible
- **Requirements:** Entire focus indicator visible, not covered by other content

### 2.4.13 Focus Appearance (Level AAA)
- **Description:** Focus indicator has sufficient size and contrast
- **Requirements:** Minimum 2px border with 3:1 contrast

### 2.5.7 Dragging Movements (Level AA)
- **Description:** Functionality using dragging has single-pointer alternative
- **Requirements:** Provide click/tap alternative to drag-and-drop

### 2.5.8 Target Size (Minimum) (Level AA)
- **Rule IDs:** `target-size`
- **Description:** Touch targets at least 24x24 CSS pixels
- **Requirements:** Buttons, links sufficient size for touch interaction

### 3.2.6 Consistent Help (Level A)
- **Description:** Help mechanisms in same order across pages
- **Requirements:** Contact info, help links consistently located

### 3.3.7 Redundant Entry (Level A)
- **Description:** Information previously entered is auto-populated or selectable
- **Requirements:** Don't ask users to re-enter same data

### 3.3.8 Accessible Authentication (Minimum) (Level AA)
- **Description:** Authentication doesn't require cognitive function test
- **Requirements:**
  - No CAPTCHAs requiring pattern recognition
  - Provide alternative authentication methods
  - Allow password managers

---

## Testing Tools

- **Automated:** axe-core, Lighthouse, WAVE
- **Manual:** Screen readers (NVDA, JAWS, VoiceOver)
- **Contrast:** WebAIM Contrast Checker
- **Validators:** W3C HTML Validator, axe DevTools

---

## Priority Levels

### Level A (Minimum)
Must satisfy to be accessible at all. Most critical violations.

### Level AA (Mid-range)  
Recommended standard for most websites. Includes contrast, zoom, keyboard access.

### Level AAA (Highest)
Enhanced accessibility. Not always achievable for all content.

---

**Note:** This MCP server focuses on **automated testing** which covers ~30-40% of WCAG. Manual testing required for complete compliance.
