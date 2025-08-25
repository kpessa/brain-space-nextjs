#!/bin/bash

# Fix calc(100vh-4rem) patterns in TSX files
echo "Fixing viewport height issues in TSX files..."

# Files to fix
files=(
  "app/(dashboard)/matrix/matrix-client.tsx"
  "app/(dashboard)/routines/routines-client.tsx"
  "app/(dashboard)/recurring/recurring-client.tsx"
  "app/(dashboard)/matrix-demo/matrix-demo-client.tsx"
  "app/(dashboard)/matrix-deep-demo/matrix-deep-demo-client.tsx"
  "app/(dashboard)/todos/todos-client.tsx"
  "app/(dashboard)/timebox/timebox-client.tsx"
  "app/(dashboard)/journal/new/new-journal-client.tsx"
  "app/(dashboard)/journal/journal-client.tsx"
  "app/(dashboard)/progress/progress-client.tsx"
  "app/(dashboard)/braindump/braindump-client.tsx"
)

for file in "${files[@]}"; do
  if [ -f "$file" ]; then
    echo "Fixing $file..."
    # Replace min-h-[calc(100vh-4rem)] with min-h-[calc(var(--vh,1vh)*100-4rem)]
    sed -i 's/min-h-\[calc(100vh-4rem)\]/min-h-[calc(var(--vh,1vh)*100-4rem)]/g' "$file"
    # Replace h-[calc(100vh-4rem)] with h-[calc(var(--vh,1vh)*100-4rem)]
    sed -i 's/h-\[calc(100vh-4rem)\]/h-[calc(var(--vh,1vh)*100-4rem)]/g' "$file"
  fi
done

# Fix the inline style in TimeSlotsList.tsx
if [ -f "components/timebox/TimeSlotsList.tsx" ]; then
  echo "Fixing components/timebox/TimeSlotsList.tsx..."
  sed -i "s/maxHeight: 'calc(100vh - 250px)'/maxHeight: 'calc(var(--vh, 1vh) * 100 - 250px)'/g" "components/timebox/TimeSlotsList.tsx"
fi

echo "✅ Viewport height fixes complete!"
