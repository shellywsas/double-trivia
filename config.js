// config.js
// קובץ זה מכיל את כל ההגדרות של נושאי המשחק.
// אם תרצי להוסיף נושא חדש בעתיד, פשוט הוסיפי אותו לכאן!

const gameConfig = {
    categories: [
        { id: 'gen', title: '🎲 ידע כללי', file: 'questions/gen.js' },
        { id: 'geo', title: '🌍 גיאוגרפיה', file: 'questions/geo.js' },
        { id: 'music', title: '🎸 מוזיקה', file: 'questions/music.js' },
        { id: 'sport', title: '⚽ ספורט', file: 'questions/sport.js' },
        { id: 'tv', title: '📺 סדרות נוער', subCategories: [
            { id: 'tv_hamama', title: 'החממה', file: 'questions/tv_hamama.js' },
            { id: 'tv_galis', title: 'גאליס', file: 'questions/tv_galis.js' },
            { id: 'tv_shminiya', title: 'השמיניה', file: 'questions/tv_shminiya.js' },
            { id: 'tv_shchuna', title: 'שכונה', file: 'questions/tv_shchuna.js' }
        ]}
    ]
};