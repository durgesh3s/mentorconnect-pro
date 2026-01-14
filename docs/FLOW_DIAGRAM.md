# Mentorise - Complete Flow Diagram

## Overview
This document provides a comprehensive flow diagram of the Mentorise platform, showing all user journeys, system interactions, and data flows.

---

## 1. Application Entry & Authentication Flow

```mermaid
flowchart TD
    A[User Visits Homepage /] --> B{Authenticated?}
    B -->|No| C[Select Role Page]
    B -->|Yes| D[Redirect to Dashboard]
    
    C --> E[Choose Role: Student]
    E --> F[Store pendingRole in localStorage]
    F --> G[OAuth Redirect: Google/LinkedIn]
    G --> H[OAuth Callback /auth/callback]
    H --> I{Valid Code?}
    I -->|No| C
    I -->|Yes| J[Exchange Code for Token]
    J --> K[Store Token in localStorage]
    K --> L[Set User in AuthStore]
    L --> M[Complete Profile Page]
    
    M --> N{Profile Complete?}
    N -->|No| O[Fill Mandatory Fields]
    O --> P[Submit Profile]
    P --> Q{Validation Pass?}
    Q -->|No| O
    Q -->|Yes| R[Save Profile to Backend]
    R --> S[Update User in AuthStore]
    S --> D
    
    N -->|Yes| D
    
    D --> U[Student Dashboard]
```

---

## 2. Student Journey Flow

```mermaid
flowchart TD
    A[Student Dashboard] --> B[Browse Courses /courses]
    A --> C[View Feed /feed]
    A --> D[View Profile /profile/:username]
    A --> E[View Certificates /certificates]
    A --> F[Settings /settings]
    
    B --> G[Search/Filter Courses]
    G --> H[View Course Details /courses/:id]
    H --> I{Already Enrolled?}
    I -->|Yes| J[Go to Course Player /courses/:id/learn]
    I -->|No| K[View Course Info]
    K --> L[Check Enrollment Limit]
    L --> M{Slots Available?}
    M -->|No| N[Show Waitlist/Full Message]
    M -->|Yes| O[Subscribe Page /courses/:id/subscribe]
    
    O --> P[Select Subscription Plan]
    P --> Q{Plan Type?}
    Q -->|Monthly| R[Monthly Price]
    Q -->|Quarterly| S[Quarterly Price -10%]
    Q -->|Annual| T[Annual Price -20%]
    
    R --> U[Initialize Payment]
    S --> U
    T --> U
    
    U --> V[Razorpay Payment Gateway]
    V --> W{Payment Success?}
    W -->|Yes| X[Payment Success Page]
    W -->|No| Y[Payment Failure Page]
    
    X --> Z[Enroll in Course]
    Z --> J
    
    J --> AA[View Course Modules]
    AA --> AB{Module 1?}
    AB -->|Yes| AC[Free - Unlocked]
    AB -->|No| AD{Subscribed?}
    AD -->|Yes| AE[Unlock Module]
    AD -->|No| AF[Locked - Subscribe Prompt]
    
    AC --> AG[Watch Videos]
    AE --> AG
    AG --> AH[Complete Assignments]
    AH --> AI[Submit Projects]
    AI --> AJ[Take Quizzes]
    AJ --> AK[Track Progress]
    AK --> AL[View Leaderboard /courses/:id/leaderboard]
    
    AL --> AM[Check Ranking]
    AM --> AN{Top 5-10?}
    AN -->|Yes| AO[Eligible for Internship]
    AN -->|No| AP[Continue Learning]
    
    AO --> AS[Receive Internship Offer]
    
    AS --> AT{Accept Offer?}
    AT -->|Yes| AU[3-Month Internship Starts]
    AT -->|No| AP
    
    AK --> AV{Course Complete?}
    AV -->|Yes| AW[Certificate Issued]
    AW --> AX[Certificate Added to Profile]
    AV -->|No| AK
```

---

## 3. Payment & Subscription Flow

```mermaid
flowchart TD
    A[User Selects Course] --> B[Click Subscribe]
    B --> C[Subscribe Page /courses/:id/subscribe]
    C --> D[Select Subscription Plan]
    
    D --> E{Plan Type?}
    E -->|Monthly| F[₹X/month]
    E -->|Quarterly| G[₹X/quarter - 10% discount]
    E -->|Annual| H[₹X/year - 20% discount]
    
    F --> I[Click Subscribe Button]
    G --> I
    H --> I
    
    I --> J[API: POST /courses/:id/subscribe]
    J --> K[Backend Creates Order]
    K --> L[Calculate Amount]
    L --> M[Generate Order ID]
    M --> N[Return Order Details]
    
    N --> O[Initialize Razorpay]
    O --> P[Razorpay Checkout]
    P --> Q{Payment Method?}
    Q -->|Card| R[Card Payment]
    Q -->|UPI| S[UPI Payment]
    Q -->|Net Banking| T[Net Banking]
    Q -->|Wallet| U[Wallet Payment]
    
    R --> V{Payment Status?}
    S --> V
    T --> V
    U --> V
    
    V -->|Success| W[Payment Success Callback]
    V -->|Failed| X[Payment Failure Callback]
    
    W --> Y[API: POST /payment/verify]
    Y --> Z{Verification Success?}
    Z -->|Yes| AA[Create Subscription Record]
    Z -->|No| AB[Payment Verification Failed]
    
    AA --> AC[Enroll Student in Course]
    AC --> AD[Update Course Enrollment Count]
    AD --> AE[Generate Invoice]
    AE --> AF[Send Confirmation Email]
    AF --> AG[Redirect to Payment Success Page]
    AG --> AH[Redirect to Course Player]
    
    X --> AI[Redirect to Payment Failure Page]
    AI --> AJ[Show Error Message]
    AJ --> AK[Option to Retry Payment]
    AK --> I
    
    AB --> AI
    
    AA --> AL[Store Subscription Details]
    AL --> AM[Set Auto-renewal if enabled]
    AM --> AN[Track Subscription Status]
```

---

## 4. Social Features Flow

```mermaid
flowchart TD
    A[Feed Page /feed] --> B{Filter?}
    B -->|All| C[Show All Threads]
    B -->|Following| D[Show Following Only]
    
    C --> E[Display Threads]
    D --> E
    
    E --> F[View Thread Card]
    F --> G[Author Avatar & Name]
    G --> H[Thread Content]
    H --> I[Images if any]
    I --> J[Like/Comment Count]
    J --> K[Timestamp]
    
    K --> L{User Action?}
    L -->|Like| M[POST /threads/:id/like]
    L -->|Comment| N[Open Comment Section]
    L -->|Share| O[Share Thread]
    L -->|View Profile| P[Navigate to /profile/:username]
    L -->|Create Thread| Q[Create Thread Page]
    
    M --> R[Update Like Count]
    R --> S[Toggle Like State]
    S --> E
    
    N --> T[POST /threads/:id/comment]
    T --> U[Add Comment]
    U --> V[Update Comment Count]
    V --> E
    
    Q --> W[Thread Creation Form]
    W --> X[Enter Text Content]
    X --> Y[Upload Images - Max 10]
    Y --> Z[Add Hashtags]
    Z --> AA[Mention Users @username]
    AA --> AB[POST /threads/create]
    
    AB --> AC{Validation?}
    AC -->|Pass| AD[Create Thread]
    AC -->|Fail| AE[Show Error]
    AE --> W
    
    AD --> AF[Check Thread Limit: Max 10]
    AF --> AG{Under Limit?}
    AG -->|Yes| AH[Save Thread]
    AG -->|No| AI[Delete Oldest Thread]
    AI --> AH
    
    AH --> AJ[Update Profile Threads]
    AJ --> AK[Add to Feed]
    AK --> E
    
    P --> AL[Profile View Page]
    AL --> AM[View User Info]
    AM --> AN[View Threads]
    AN --> AO[View Certificates]
    AO --> AP[View Enrolled Courses]
    AP --> AQ{Current User?}
    AQ -->|Yes| AR[Edit Profile Option]
    AQ -->|No| AS[Follow/Unfollow Button]
    
    AS --> AT{Following?}
    AT -->|No| AU[POST /profile/:username/follow]
    AT -->|Yes| AV[POST /profile/:username/unfollow]
    
    AU --> AW[Update Follower Count]
    AV --> AW
    AW --> AL
```

---

## 5. Course Learning Flow

```mermaid
flowchart TD
    A[Course Player /courses/:id/learn] --> B[Load Course Data]
    B --> C[Check Enrollment Status]
    C --> D{Enrolled?}
    D -->|No| E[Redirect to Subscribe]
    D -->|Yes| F[Load Course Modules]
    
    F --> G[Display Module List]
    G --> H{Module Number?}
    H -->|Module 1| I[FREE - Always Unlocked]
    H -->|Module 2+| J{Subscribed?}
    
    J -->|Yes| K[Unlock Module]
    J -->|No| L[Show Lock Icon]
    L --> M[Prompt to Subscribe]
    
    I --> N[Select Lesson]
    K --> N
    
    N --> O[Load Lesson Content]
    O --> P{Content Type?}
    P -->|Video| Q[Embed Video Player]
    P -->|PDF| R[Display PDF Viewer]
    P -->|Code| S[Code Editor/Viewer]
    P -->|Link| T[External Link]
    
    Q --> U[Track Video Progress]
    U --> V[Save Progress to Backend]
    V --> W[Update Completion %]
    
    R --> X[Mark as Read]
    S --> Y[Copy/Download Code]
    T --> Z[Open in New Tab]
    
    W --> AA[Check Lesson Complete]
    AA --> AB{All Lessons Done?}
    AB -->|Yes| AC[Unlock Next Module]
    AB -->|No| AD[Continue Learning]
    
    AC --> AE[Show Notification]
    AD --> N
    
    N --> AF[Take Notes]
    AF --> AG[Save Notes per Lesson]
    AG --> AH[Bookmark Lesson]
    AH --> AI[View Discussion Forum]
    
    AI --> AJ[Post Question]
    AJ --> AK[Instructor/Peers Answer]
    AK --> AI
    
    W --> AL[Update Leaderboard Score]
    AL --> AM[Calculate Ranking Factors]
    AM --> AN[Assignment Scores: 40%]
    AN --> AO[Project Quality: 30%]
    AO --> AP[Quiz Performance: 15%]
    AP --> AQ[Engagement: 10%]
    AQ --> AR[Completion Time: 5%]
    
    AR --> AS[Update Real-time Leaderboard]
    AS --> AT[Weekly Rankings]
    AT --> AU[Final Ranking at Completion]
```

---

## 6. Internship Selection Flow

```mermaid
flowchart TD
    A[Course Completion] --> B[Calculate Final Rankings]
    B --> C[Top 5-10 Students Identified]
    C --> D[System Generates Offers]
    
    D --> E[Send Internship Offer]
    E --> F[API: POST /internships/offer]
    F --> G[Create Offer Record]
    G --> H[Send Notification to Student]
    H --> I[Email Notification]
    I --> J[In-App Notification]
    
    J --> K[Student Receives Offer]
    K --> L[View Offer Details]
    L --> M[3-Month Internship Terms]
    M --> N[Company/Project Details]
    N --> O[Stipend Information]
    O --> P{Student Decision?}
    
    P -->|Accept| Q[POST /internships/:id/accept]
    P -->|Decline| R[POST /internships/:id/decline]
    P -->|Pending| S[Keep Offer Open]
    
    Q --> T[Create Internship Contract]
    T --> U[Update Internship Status: Active]
    U --> V[Track Internship Progress]
    V --> W[Monthly Check-ins]
    W --> X[Project Milestones]
    X --> Y[Final Evaluation]
    
    R --> Z[Mark Offer as Declined]
    
    S --> AA[Set Expiry Date: 7 days]
    AA --> AB{Expired?}
    AB -->|Yes| R
    AB -->|No| P
    
    V --> AC[Internship Dashboard]
    AC --> AD[View Tasks]
    AD --> AE[Submit Work]
    AE --> AF[Instructor Reviews]
    AF --> AG[Provide Feedback]
    AG --> AD
    
    Y --> AH{Internship Complete?}
    AH -->|Yes| AI[Issue Completion Certificate]
    AH -->|No| AD
    
    AI --> AJ[Add to Student Profile]
    AJ --> AK[Update Portfolio]
```

---

## 7. Certificate Generation Flow

```mermaid
flowchart TD
    A[Student Completes Course] --> B[All Modules Completed]
    B --> C[All Assignments Submitted]
    C --> D[All Quizzes Passed]
    D --> E[Projects Reviewed]
    E --> F[Minimum Score Achieved]
    
    F --> G[Course Completion Triggered]
    G --> H[System Validates Completion]
    
    H --> I{Meets Requirements?}
    I -->|Yes| J[Auto-Issue Certificate]
    I -->|No| K[Request Additional Work]
    K --> C
    
    J --> L[API: POST /certificates/issue]
    L --> M[Generate Certificate Data]
    M --> N[Create Unique Certificate ID]
    N --> O[Include Course Details]
    O --> P[Include Student Details]
    P --> Q[Include Instructor Details]
    Q --> R[Include Completion Date]
    R --> S[Generate Certificate PDF]
    
    S --> T[Store Certificate in Database]
    T --> U[Add to Student Profile]
    U --> V[Update Certificates Page]
    V --> W[Send Email Notification]
    W --> X[Certificate Download Link]
    
    X --> Y[Student Views Certificate]
    Y --> Z[/certificates Page]
    Z --> AA[Display Certificate Card]
    AA --> AB[Certificate ID]
    AB --> AC[Course Name]
    AC --> AD[Instructor Name]
    AD --> AE[Issue Date]
    AE --> AF[Download PDF Button]
    AF --> AG[Shareable Link]
    
    AG --> AH[Verification System]
    AH --> AI[Unique Certificate ID]
    AI --> AJ[Blockchain Verification - Future]
    AJ --> AK[Public Verification Page]
```

---

## 8. System Architecture Flow

```mermaid
flowchart LR
    A[Frontend React App] --> B[React Router]
    B --> C[Pages/Components]
    C --> D[Zustand Stores]
    D --> E[API Client]
    
    E --> F[Axios Interceptors]
    F --> G[Add Auth Token]
    G --> H[Backend API]
    
    H --> I[Express/NestJS Server]
    I --> J[Authentication Middleware]
    J --> K[Route Handlers]
    K --> L[Business Logic]
    L --> M[Database Layer]
    
    M --> N[(PostgreSQL)]
    N --> O[User Data]
    N --> P[Course Data]
    N --> Q[Payment Data]
    N --> R[Social Data]
    
    I --> S[External Services]
    S --> T[Razorpay API]
    S --> U[OAuth Providers]
    S --> V[Email Service]
    S --> W[File Storage]
    
    D --> X[Auth Store]
    D --> Y[Course Store]
    D --> Z[Profile Store]
    D --> AA[Payment Store]
    D --> AB[Notification Store]
    
    X --> AC[User State]
    X --> AD[Auth Status]
    
    Y --> AE[Course List]
    Y --> AF[Enrolled Courses]
    Y --> AG[Current Course]
    
    Z --> AH[Profile Data]
    Z --> AI[Threads]
    
    AA --> AJ[Subscriptions]
    AA --> AK[Payment History]
    
    AB --> AL[Notifications]
    AB --> AM[Real-time Updates]
    
    AM --> AN[Socket.io Client]
    AN --> AO[WebSocket Connection]
    AO --> AP[Backend Socket Server]
```

---

## 9. Data Flow Diagram

```mermaid
flowchart TD
    A[User Action] --> B{Action Type?}
    
    B -->|Auth| C[AuthStore]
    B -->|Course| D[CourseStore]
    B -->|Profile| E[ProfileStore]
    B -->|Payment| F[PaymentStore]
    B -->|Notification| G[NotificationStore]
    
    C --> H[API Call]
    D --> H
    E --> H
    F --> H
    G --> H
    
    H --> I[API Client]
    I --> J[Request Interceptor]
    J --> K[Add Token]
    K --> L[Backend API]
    
    L --> M[Validate Token]
    M --> N{Valid?}
    N -->|No| O[401 Unauthorized]
    N -->|Yes| P[Process Request]
    
    P --> Q[Database Query]
    Q --> R[(PostgreSQL)]
    R --> S[Return Data]
    S --> T[Response Interceptor]
    T --> U{Status?}
    
    U -->|200| V[Update Store]
    U -->|401| W[Clear Auth]
    U -->|Error| X[Show Toast]
    
    V --> Y[Update UI]
    W --> Z[Redirect to Login]
    X --> AA[User Sees Error]
    
    Y --> AB[Component Re-renders]
    AB --> AC[Display Updated Data]
```

---

## 10. Navigation Flow Map

```mermaid
flowchart TD
    A[Homepage /] --> B[Auth Flow]
    A --> C[Browse Courses /courses]
    A --> D[View Feed /feed]
    
    B --> E[/auth/select-role]
    E --> F[/auth/callback]
    F --> G[/auth/complete-profile]
    G --> I[/dashboard/student]
    
    I --> K[My Courses]
    I --> L[Progress Tracking]
    I --> M[Certificates]
    I --> N[Leaderboard]
    
    C --> S[/courses/:id]
    S --> T[/courses/:id/subscribe]
    T --> U[/payment/success]
    T --> V[/payment/failure]
    U --> W[/courses/:id/learn]
    V --> T
    
    W --> X[/courses/:id/leaderboard]
    
    D --> Y[/threads/create]
    D --> Z[/profile/:username]
    
    Z --> AA[/profile/edit]
    
    I --> AB[/certificates]
    I --> AC[/internships]
    I --> AD[/settings]
```

---

## Key Features Summary

### Authentication & Authorization
- Role-based access (Student/Mentor)
- OAuth integration (Google/LinkedIn)
- JWT token management
- Session persistence

### Course Management
- Course browsing & search
- Enrollment with limits (30-50 students)
- Progressive module unlocking
- Video/content delivery

### Payment & Subscriptions
- Multiple subscription tiers (Monthly/Quarterly/Annual)
- Razorpay integration
- Payment verification
- Auto-renewal support

### Learning Features
- Progress tracking
- Assignment submission
- Quiz system
- Project reviews
- Notes & bookmarks
- Discussion forums

### Ranking & Internships
- Real-time leaderboard
- Multi-factor ranking algorithm
- Top performer selection
- Internship offer system
- 3-month internship tracking

### Social Features
- Threads (posts with images)
- Like/Comment system
- Follow/Unfollow
- Personalized feed
- Profile viewing

### Certifications
- Course completion certificates
- PDF generation
- Verification system
- Profile integration

---

## Technology Stack

**Frontend:**
- React 18 + TypeScript
- React Router v6
- Zustand (State Management)
- TanStack Query
- Axios (API Client)
- shadcn/ui + Tailwind CSS
- Socket.io Client

**Backend (Expected):**
- Node.js + Express/NestJS
- PostgreSQL
- Redis (Caching)
- JWT Authentication
- Razorpay SDK
- Socket.io Server

**External Services:**
- Razorpay (Payments)
- Google OAuth
- LinkedIn OAuth
- Email Service (SendGrid/AWS SES)
- File Storage (AWS S3/Cloudinary)

---

*Last Updated: 2024*
*Document Version: 1.0*

