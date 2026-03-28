// config.js

const gameConfig = {
    categories: [
        { id: 'gen', title: '🎲 ידע כללי', file: 'questions/gen.js', icons: ['🌍','🚀','💡','⏰','💎','🎲','🧩','🔬','🧬','🔭','💻','⚡','🪐','🧪','🔋','📡','🦠','🧲','🗽','🗼'] },
        { id: 'kids', title: '🧸 ילדים (עד גיל 10)', file: 'questions/kids.js', icons: ['🧸','🎈','🦄','🐶','🐱','🐰','🐼','🐸','🐯','🦁','🐮','🐷','🐒','🐔','🐧','🐦','🐤','🍭','🍬','🍫','🪁','🚗','🚁','🎡'] },
        
        { id: 'elementary', title: '🎒 יסודי (כיתות ג\'-ו\')', icons: ['🎒','📚','✏️','🚌','🧠','🔬','🌍','📖','📐','💡'], subCategories: [
            { id: 'elementary_mixed', title: 'מעורבב', file: 'questions/elementary_mixed.js' },
            { id: 'elementary_science', title: 'מדעים וטבע', file: 'questions/elementary_science.js' },
            { id: 'elementary_geohistory', title: 'גאוגרפיה והיסטוריה', file: 'questions/elementary_geohistory.js' },
            { id: 'elementary_language', title: 'שפה וספרות', file: 'questions/elementary_language.js' },
            { id: 'elementary_math', title: 'מתמטיקה והיגיון', file: 'questions/elementary_math.js' }
        ]},

        { id: 'evolution', title: '🧬 אבולוציה', file: 'questions/evolution.js', icons: ['🧬','🐒','🌍','🦖','🦕','🦴','🌿','🦠','🔬','👣','🐟','🐸','🦧','🦍','🦅','🐢','🦎'] },
        
        { id: 'physics', title: '🧲 פיזיקה', icons: ['🧲','⚡','💡','🔭','🚀','🍎','🍏','📉','📈','📏','📐','⚛️','🔋'], subCategories: [
            { id: 'physics_mechanics', title: 'מכניקה', file: 'questions/physics_mechanics.js' },
            { id: 'physics_electricity', title: 'חשמל', file: 'questions/physics_electricity.js' },
            { id: 'physics_mixed', title: 'מעורבב', file: 'questions/physics_mixed.js' }
        ]},

        { id: 'math', title: '➗ מתמטיקה', icons: ['➗','✖️','➕','➖','📐','📏','📊','📉','📈','🔢','💯'], subCategories: [
            { id: 'math_calculus', title: 'חדו"א', file: 'questions/math_calculus.js' },
            { id: 'math_geometry', title: 'הנדסה וטריגו', file: 'questions/math_geometry.js' },
            { id: 'math_mixed', title: 'מעורבב', file: 'questions/math_mixed.js' }
        ]},

        { id: 'cs', title: '💻 מדעי המחשב', icons: ['💻','⌨️','🖥️','🖱️','🌐','⚙️','👾','💾','🕹️','🤖'], subCategories: [
            { id: 'cs_java', title: 'Java', file: 'questions/cs_java.js' },
            { id: 'cs_python', title: 'Python', file: 'questions/cs_python.js' },
            { id: 'cs_javascript', title: 'JavaScript', file: 'questions/cs_javascript.js' },
            { id: 'cs_csharp', title: 'C#', file: 'questions/cs_csharp.js' }
        ]},

        { id: 'sport', title: '⚽ ספורט', icons: ['⚽','🏀','🏈','⚾','🎾','🏐','🏉','🎱','🏓','🏸','🥅','🏒','🏑','🏏','⛳','🏹','🎣','🥊','🥋','⛸️','🎿','🏂','🏋️','🤺','🤼','🤸','⛹️','🤾','🏌️','🏄','🏊','🤽','🚣','🏇','🚴','🏆','🥇','🏅'], subCategories: [
            { id: 'sport_mixed', title: 'מעורבב', file: 'questions/sport.js' },
            { id: 'sport_football', title: 'כדורגל', file: 'questions/sport_football.js' },
            { id: 'sport_basketball', title: 'כדורסל', file: 'questions/sport_basketball.js' },
            { id: 'sport_volleyball', title: 'כדורעף', file: 'questions/sport_volleyball.js' }
        ]},

        { id: 'history', title: '📜 היסטוריה', icons: ['📜','🏰','👑','🏺','⚔️','🛡️','🪙','🗝️','🕰️','🕯️','🪔','⏳','⌛','🗺️','🧭','⚓','⛵','🗿','🏛️','🕍','⛩️','🕋','📿','✒️','📝'], subCategories: [
            { id: 'history_mixed', title: 'מעורבב', file: 'questions/history_mixed.js' },
            { id: 'history_state', title: 'הקמת המדינה', file: 'questions/history_state.js' },
            { id: 'history_holocaust', title: 'השואה', file: 'questions/history_holocaust.js' },
            { id: 'history_nationalism', title: 'לאומיות', file: 'questions/history_nationalism.js' },
            { id: 'history_ww1', title: 'מלחמת העולם ה-1', file: 'questions/history_ww1.js' },
            { id: 'history_ww2', title: 'מלחמת העולם ה-2', file: 'questions/history_ww2.js' },
            { id: 'history_wars', title: 'מלחמות ישראל', file: 'questions/history_wars.js' }
        ]},

        { id: 'civics', title: '⚖️ אזרחות', icons: ['⚖️','🏛️','📜','🤝','🕊️','🌍','🗳️','💼','📊','📉','📈','📌','📎','✒️','📝','📁','📂','📰','🗞️','📢','💡'], subCategories: [
            { id: 'civics_mixed', title: 'מעורבב', file: 'questions/civics_mixed.js' },
            { id: 'civics_rights', title: 'זכויות', file: 'questions/civics_rights.js' },
            { id: 'civics_bagrut', title: 'חומרי בגרות', file: 'questions/civics_bagrut.js' }
        ]},

        { id: 'tanakh', title: '📖 תנ"ך', icons: ['📖','🕊️','🐪','🐑','🐐','🍇','🌾','🔥','💧','🌩️','🌈','☀️','🌙','✨','⛺','👑','🏺','📜','🦁','🐍'], subCategories: [
            { id: 'tanakh_mixed', title: 'מעורבב', file: 'questions/tanakh_mixed.js' },
            { id: 'tanakh_kohelet', title: 'קהלת', file: 'questions/tanakh_kohelet.js' },
            { id: 'tanakh_iyov', title: 'איוב', file: 'questions/tanakh_iyov.js' },
            { id: 'tanakh_bereshit', title: 'בראשית', file: 'questions/tanakh_bereshit.js' }
        ]},

        { id: 'tv', title: '📺 סדרות נוער', icons: ['📺','🎬','🍿','🎥','📽️','🎞️','🎭','🎟️','🎫','🦸','🦹','🧙','🧚','🧛','🧜','🧝','🧞','🧟','📸','📱'], subCategories: [
            { id: 'tv_hamama', title: 'החממה', file: 'questions/tv_hamama.js' },
            { id: 'tv_galis', title: 'גאליס', file: 'questions/tv_galis.js' },
            { id: 'tv_shminiya', title: 'השמיניה', file: 'questions/tv_shminiya.js' },
            { id: 'tv_shchuna', title: 'שכונה', file: 'questions/tv_shchuna.js' }
        ]},
        
        { id: 'geo', title: '🌍 גיאוגרפיה', file: 'questions/geo.js', icons: ['🌍','🌎','🌏','🗺️','🧭','🌋','🗻','🏕️','🏖️','🏜️','🏝️','🏞️','🏙️','🌆','🌇','🌌','🌠','✈️','🛳️','🚂'] },
        { id: 'music', title: '🎸 מוזיקה', file: 'questions/music.js', icons: ['🎸','🎹','🎧','🎤','🎵','🎶','🎷','🎺','🎻','🪕','🥁','🪘','📻','🎙️','🎛️','🎚️','💿','📀','📼','🎼'] }
    ]
};