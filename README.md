# Interactive Slide Deck

An interactive presentation tool for classroom engagement, featuring real-time sentiment analysis and quiz functionality. Built for the Introduction to Coding in the Humanities course.

## Features

- **Interactive Presentation**: Built with [Reveal.js](https://revealjs.com/) for smooth, professional slide transitions.
- **Cross-Device Connectivity**: 
  - Instructor generates a unique session via **PeerJS**.
  - Students join by scanning a **QR Code** with their phones.
  - Works over different networks (e.g., Instructor on Wi-Fi, Student on 5G).
- **Real-time Sentiment Analysis**: 
  - Students submit thoughts/feelings.
  - Visualized instantly as color-coded bubbles (Green=Positive, Red=Negative).
  - Bubbles automatically sort into "Sentiment Zones" on the screen.
- **Live Quiz Integration**: 
  - 10-question skills check (Python & NLP concepts).
  - **Instructor View**: Shows granular results (Correct/Incorrect count per question).
  - **Student View**: Shows personal results vs. class average after completion.
- **Dual Views**:
  - Instructor view ([index.html](index.html)) - Presentation, QR code, and live analytics.
  - Student view ([student.html](student.html)) - Mobile-optimized input interface.

## Getting Started

### Prerequisites

No installation required! This project runs entirely in the browser using CDN-hosted libraries.

### Usage

1. **Instructor Setup**:
   - Open `index.html` (or your deployed URL).
   - A **QR Code** will appear on the title slide once the host is ready.
   - Navigate slides using arrow keys.

2. **Student Participation**:
   - Scan the QR code with a phone camera.
   - Enter thoughts/feelings (Slide 2).
   - Answer the 10 quiz questions as they appear on the main screen.
   - View comparison results ("You vs Class") at the end.

### Local Development

Simply clone the repository and open the HTML files in your browser:

```bash
git clone https://github.com/TCU-DCDA/interactive_slide_deck.git
cd interactive_slide_deck
# Open index.html in your browser
```

## Deployment

This project is a static site (HTML/CSS/JS) and can be deployed instantly on **Netlify** or **Vercel**.

### Option 1: Netlify (Recommended)
1. Push your code to GitHub.
2. Log in to [Netlify](https://www.netlify.com/).
3. Click **"Add new site"** > **"Import an existing project"**.
4. Select your GitHub repository.
5. **Build Settings**:
   - **Build command**: (Leave blank)
   - **Publish directory**: `.` (or leave blank)
6. Click **Deploy**.

### Option 2: Vercel
1. Push your code to GitHub.
2. Log in to [Vercel](https://vercel.com/).
3. Click **"Add New..."** > **"Project"**.
4. Import your GitHub repository.
5. Keep the default settings (Framework Preset: Other).
6. Click **Deploy**.

Once deployed, the **QR Code** on the instructor screen will automatically point to the live URL, allowing students to join from anywhere without needing to be on the same Wi-Fi.

## Project Structure

```
interactive_slide_deck/
├── index.html          # Instructor presentation view
├── student.html        # Student input interface
├── css/
│   └── style.css      # Custom styling
├── js/
│   ├── script.js      # Main presentation logic
│   └── student.js     # Student interface logic
└── backup_v1/         # Previous version backup
```

## Technologies Used

- [Reveal.js](https://revealjs.com/) - Presentation framework
- [PeerJS](https://peerjs.com/) - WebRTC networking for real-time cross-device sync
- [QRCode.js](https://davidshimjs.github.io/qrcodejs/) - QR code generation
- Vanilla JavaScript - Custom logic for sentiment analysis and quiz state
- HTML5/CSS3 - Structure and styling

## Use Cases

- End-of-semester class reflections
- Live classroom polls
- Interactive skill assessments
- Real-time student engagement tracking

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## Contributing

Contributions are welcome! Feel free to submit issues or pull requests.

## Acknowledgments

Created for the TCU Introduction to Coding in the Humanities course.
