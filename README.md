# HR Benefit Bot

## Project Overview

This project is an interactive chatbot designed for HR departments to quickly answer staff queries regarding company benefits. Specifically, it helps employees understand what items are claimable under various benefit categories, such as "Sports Benefits". The chatbot provides clear answers and reasoning for items that are not claimable, based on a predefined policy document.

## Features

-   **Categorized Q&A:** Answers questions based on specific benefit categories.
-   **Claimability Check:** Determines if an item is claimable based on a defined list.
-   **Reasoning for Non-Claimable Items:** Provides explanations when an item is not covered by the policy.
-   **Modern Web Interface:** A clean, AI-inspired user interface for easy interaction.
-   **Vercel Deployment Ready:** Configured for seamless deployment to Vercel.

## Technology Stack

-   **Frontend:** React.js (with Next.js) for a dynamic and responsive user interface.
-   **Backend:** Next.js API Routes (serverless functions) for handling chatbot logic and data processing.
-   **Styling:** Custom CSS for a modern, dark-themed, and professional look.
-   **Data Storage:** JSON file (`HR_Sports_Benefits_policy.json`) for flexible and easily updatable benefit policies.
-   **Deployment:** Vercel for continuous deployment and hosting.

## Setup Instructions (Local Development)

To run this project on your local machine, follow these steps:

1.  **Clone the repository:**
    ```bash
    git clone https://github.com/JossenAJT/vibe-coding-benefitbot.git
    cd vibe-coding-benefitbot
    ```

2.  **Install dependencies:**
    ```bash
    npm install
    ```

3.  **Run the development server:**
    ```bash
    npm run dev
    ```

    The application will be accessible at `http://localhost:3000`.

## Deployment Instructions (Vercel)

This project is configured for easy deployment to Vercel.

1.  **Push to GitHub:** Ensure your project is pushed to a GitHub repository (which you've already done).

2.  **Import Project to Vercel:**
    *   Go to your [Vercel Dashboard](https://vercel.com/dashboard).
    *   Click on "Add New..." -> "Project".
    *   Select your Git repository (`JossenAJT/vibe-coding-benefitbot`).
    *   Vercel will automatically detect it's a Next.js project and configure the build settings.
    *   Click "Deploy".

3.  **Automatic Updates:** After the initial deployment, any subsequent pushes to your `master` branch on GitHub will automatically trigger a new build and deployment on Vercel.

## Usage

Once the application is running (either locally or deployed on Vercel):

1.  Open your web browser and navigate to the application URL.
2.  Type your benefit-related question into the input field (e.g., "Is a gym membership claimable?" or "Can I claim a yoga mat?").
3.  Press "Send" or hit Enter.
4.  The chatbot will respond with whether the item is claimable and provide relevant reasoning.

## Data Structure: `HR_Sports_Benefits_policy.json`

The core logic of the chatbot relies on the `public/HR_Sports_Benefits_policy.json` file. This JSON file defines:

-   `policy_name`, `version`, `jurisdiction`, `currency`, `scope_note`.
-   `eligibility`, `claim_year_rule`, `receipt_rule`, `approval` details.
-   `categories`: An array of allowed benefit categories, each with:
    -   `id`, `key`, `name`.
    -   `allowed`: Boolean indicating if the category is generally allowed.
    -   `conditions`: Specific rules for the category (e.g., `in_person_only`).
    -   `examples_included`: Specific items that *are* claimable.
    -   `examples_excluded`: Specific items that are *not* claimable.
-   `not_allowed`: Explicitly disallowed items with reasons.
-   `matching`: Synonyms for better natural language understanding.
-   `decision_flow`: An ordered list of actions the chatbot takes to process a query.
-   `responses`: Predefined response messages for various scenarios.
-   `default_behavior`: General rules for items not explicitly listed.

To update the chatbot's knowledge, simply modify this JSON file.

## Future Enhancements

-   **Natural Language Processing (NLP):** Integrate a more advanced NLP library to better understand user queries, including variations in phrasing and intent.
-   **Multiple Benefit Categories:** Expand the `HR_Sports_Benefits_policy.json` to include other benefit categories (e.g., Wellness, Education, Travel).
-   **User Authentication:** Implement user login to personalize responses or track queries.
-   **Admin Interface:** Create a simple admin panel to manage benefit policies without directly editing the JSON file.
-   **Database Integration:** Store policies in a database for more robust management and scalability.
-   **Interactive Elements:** Add buttons or quick replies to guide user interaction.