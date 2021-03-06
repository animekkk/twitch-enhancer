import { Module } from '../module.js';
import { getVideoId } from '../../utils/url.js';
import { logger } from '../../utils/logger.js';

export const videoModule = new Module('video', callback, 'te_real_vod_time');

let player;

let timeSpan;
let videoElement;
let videoDate;
let videoId;
let timeInterval;
let idInterval;

function callback(element) {
	if (!window.location.href.includes('/videos/')) return;
	player = element;
	player.setAttribute('twitch-enhancer', '');
	createTime(player);

    window.createTime = createTime;

}

async function createTime(element) {
	let controls = document.querySelectorAll(
		'.player-controls__left-control-group'
	);
	if (controls.length < 1) return;
    controls = controls[controls.length - 1];
	videoElement = document.querySelector('video');
	timeSpan = document.createElement('span');
	timeSpan.id = 'te-vod-time';
	timeSpan.className = 'te-video-button';
	timeSpan.textContent = 'Loading...';
	timeSpan.addEventListener('click', setTimeFromVod);
	controls.appendChild(timeSpan);
	videoId = getVideoId(window.location.href);
	logger.info(`Found new video! (${videoId})`);
	videoDate = await getVideoDate(videoId);
	setTime();
	timeInterval = setInterval(() => setTime(), 500);
	idInterval = setInterval(() => checkId(), 1000);
    console.log(controls);
    console.log(document.querySelector(
		'.player-controls__left-control-group'
	));
}

function checkId() {
	const newId = getVideoId(window.location.href);
	if (videoId && newId !== videoId) reset();
}

function reset() {
	document.querySelector('#te-vod-time').remove();
	clearInterval(timeInterval);
	clearInterval(idInterval);
	player.removeAttribute('twitch-enhancer');
	logger.info('Reseting real video time.');
}

async function getVideoDate(id) {
	const data = await fetch(`https://wcapi.vopp.top/video/${id}`);
	const json = await data.json();
	return new Date(json.data[0].created_at);
}

function setTime() {
	timeSpan.textContent = getTime(getCurrentTime());
}

function getTime(date) {
	return date.toLocaleTimeString();
}

function getCurrentVideoTime() {
	return videoElement.currentTime;
}

function getCurrentTime() {
	return new Date(videoDate.getTime() + getCurrentVideoTime() * 1000);
}

async function setTimeFromVod() {
	const url = new URL(
		prompt(
			'Paste here video link with timestamp: \n(e.g. https://www.twitch.tv/videos/123456789?t=00h42m51s)'
		)
	);
	const id = getVideoId(url.href);
	const timestamp = url.searchParams
		.get('t')
		.replace(/\D/g, ':')
		.replace('s', '')
		.split(':');
	const seconds =
		parseInt(timestamp[0]) * 60 * 60 +
		parseInt(timestamp[1]) * 60 +
		parseInt(timestamp[2]);
	const createDate = await getVideoDate(id);
	let date = new Date(createDate.getTime() + seconds * 1000);
	videoElement.currentTime = (date.getTime() - videoDate.getTime()) / 1000;
}