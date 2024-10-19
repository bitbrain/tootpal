# TootPal

Welcome to **tootpal**! Your friendly companion for discovering and connecting with new people on Mastodon.

## Overview

tootpal is a web application designed to help Mastodon users find and follow other users who share similar interests. By searching for hashtags, TootPal aggregates recent toots (posts) and displays profiles associated with those hashtags. You can preview a user's recent toot and follow them directly from the app.

## Features

- **Hashtag Search**: Find users by searching for hashtags relevant to your interests.
- **Profile Previews**: View a user's display name, avatar, and a recent toot.
- **Follow Users**: Follow new users directly from TootPal without leaving the app.
- **Filter Followed Accounts**: Automatically hides profiles you already follow or have blocked, with the option to show them if desired.
- **Responsive Design**: Enjoy a seamless experience on both desktop and mobile devices.
- **Mastodon Authentication**: Securely log in with your Mastodon account to interact with profiles.

## Getting Started

### Accessing TootPal

Visit [https://bitbra.in/tootpal](https://bitbra.in/tootpal) to start using tootpal.

### Logging In

1. **Click on "Login with Mastodon"**: You'll be redirected to the Mastodon authentication page.
2. **Enter Your Instance URL**: Provide the URL of your Mastodon instance (e.g., `https://mastodon.social`).
3. **Authorize TootPal**: Log in to your account and authorize TootPal to access your Mastodon account.

### Searching for Users

1. **Enter Hashtags**: In the search bar, input one or more hashtags related to your interests (e.g., `#photography`, `#tech`).
2. **Select Mastodon Server to Search**: Specify the Mastodon server you want to search (default is `https://mastodon.social`).
3. **Click "Search"**: TootPal will fetch profiles associated with the provided hashtags.

### Browsing Results

- **Profile Cards**: Each result displays the user's avatar, display name, username, and a recent toot.
- **Follow Button**: Click "Follow" to start following the user directly.
- **Pagination**: Navigate through multiple pages of results using the paginator at the bottom.
- **Hidden Profiles**: Profiles you already follow or have blocked are hidden by default. Click "Show All" to view them.

## Security and Privacy

- **OAuth Authentication**: TootPal uses Mastodon's OAuth 2.0 for secure authentication.
- **Data Handling**: Your access token is securely stored during your session and is not shared with third parties.
- **Permissions**: TootPal requests minimal permissions required to follow users on your behalf.

## Feedback and Support

We value your feedback! If you encounter any issues or have suggestions, please reach out to our support team:

- **Email**: support@tootpal.com
- **GitHub Issues**: [https://github.com/yourusername/tootpal/issues](https://github.com/yourusername/tootpal/issues)

## Contributing

Interested in contributing to TootPal? We'd love your help!

1. **Fork the Repository**: Start by forking the project on GitHub.
2. **Clone Your Fork**: Clone the repository to your local machine.
3. **Create a Branch**: Create a new branch for your feature or bug fix.
4. **Submit a Pull Request**: When you're ready, submit a pull request for review.

## License

TootPal is released under the [MIT License](LICENSE).

## Acknowledgments

- **Mastodon API**: Thanks to Mastodon for providing a robust API for developers.
- **PrimeVue**: UI components powered by [PrimeVue](https://www.primefaces.org/primevue/).
- **ViteSSG**: Static site generation facilitated by [ViteSSG](https://github.com/antfu/vite-ssg).

---

Thank you for using TootPal! We hope it helps you discover amazing people on Mastodon.
