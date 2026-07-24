# Homepage Premium Motion and Continuity

## Motion contract

The hero remains one continuous 24-watch orbit with a 10,000ms step period. Previous, pause/resume, next, and six scenario jumps remain available. Reduced motion disables autoplay and leaves every watch and lower-section reveal fully visible.

## Lower-section reveal

Lower sections use one-time IntersectionObserver reveals. The observer starts early with `rootMargin: 0px 0px 18% 0px` and threshold `0.06`, then unobserves each revealed target. The motion layer never hides content again during ordinary reverse scrolling.

Initial opacity is part of the layout contract: text 0.62, watch media 0.36, finalist field 0.65, Journal lead 0.55, supporting Journal stories 0.70, and decorative light no lower than 0.28. Mobile uses at least 0.75 for text and 0.45 for media.

## Timing

Text transitions use 440-560ms, media 620-760ms, line drawing 700-760ms, and desktop stagger 60ms. Mobile stagger is 45ms. Continuous decorative watch drift remains subtle and moves 4px; no scroll-jacking or smooth-scroll dependency is used.

## Continuity safeguards

Shortlist finalist reveals at index 1 and alternatives begin at index 2. Journal lead begins at index 1. Collection next-watch media begins at index 2. Large surfaces remain partially visible before reveal, preventing empty reserved chapters during fast scroll.

Hero midpoint interpolation keeps at least one central model at opacity 0.8 or higher. Product annotation remains mounted throughout motion and muted opacity does not fall below 0.68.
