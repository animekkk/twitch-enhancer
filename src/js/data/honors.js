export const honors = [
    {
        type: 'permanent',
        name: 'czarny_animekkk1337',
        description: 'Nothing.'
    }
];

export async function loadHonors() {
    const data = await fetch('https://wcapi.vopp.top/honors');
    const json = await data.json();
    honors.push(...json);
}

loadHonors();
