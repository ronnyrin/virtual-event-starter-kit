/**
 * Copyright 2020 Vercel Inc.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *      http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */
import { Job, Sponsor, Stage, Speaker } from '@lib/types';

const API_URL = 'https://www.wix.com/_api/cloud-data/v1/wix-data/collections/query';

let accessToken = '';

async function fetchCmsAPI(query: string, include?: any) {
  if (!accessToken) {
    const resToken = await fetch(
      `https://www.wixgateway.com/v1/meta-site/session-token`,
      {
        method: 'POST',
        headers: {
          'origin': process.env.WIX_API_URL!,
          'Content-Type': 'application/json'
        }
      });
    const jsonToken = await resToken.json();
    accessToken = jsonToken.accessToken;
  }

  const res = await fetch(API_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: accessToken
    },
    body: JSON.stringify({
      collectionName: query,
      ...(include && { include })
    })
  });

  const json = await res.json();
  if (json.errors) {
    // eslint-disable-next-line no-console
    console.error(json.errors);
    throw new Error('Failed to fetch API');
  }

  return json;
}

export async function getAllSpeakers(): Promise<Speaker[]> {
  const data = await fetchCmsAPI('Speaker');
  return data.items.map((item: any) => {
    const id = item.image.split('v1/')[1].split('/')[0];
    return {
      ...item,
      image: { url: `https://static.wixstatic.com/media/${id}` }
    };
  });
}

export async function getAllStages(): Promise<Stage[]> {
  const talks = await fetchCmsAPI('Talk', ['speaker', 'Stage']);
  const stages: any[] = [];

  for (const talk of talks.items) {
    const schedule = {
      title: talk.title,
      start: talk.start['$date'],
      end: talk.end['$date'],
      speaker: talk.speaker.map((speaker: any) => ({
        name: speaker.name,
        slug: speaker.slug,
        image: { url: `https://static.wixstatic.com/media/${speaker.image.split('v1/')[1].split('/')[0]}` }
      }))
    };

    if (stages[talk.Stage[0].slug]) {
      stages[talk.Stage[0].slug].schedule.push(schedule);
    } else {
      stages[talk.Stage[0].slug] = {
        name: talk.Stage[0].title,
        slug: talk.Stage[0].slug,
        stream: talk.Stage[0].stream,
        discord: talk.Stage[0].discord,
        isLive: talk.Stage[0].isLive,
        roomId: talk.Stage[0].roomId,
        schedule: [schedule]
      };
    }
  }

  return Object.values(stages);
}

export async function getAllSponsors(): Promise<Sponsor[]> {
  const data = await fetchCmsAPI('Company');
  return data.items.map((item: any) => {
    return {
      ...item,
      cardImage: { url: `https://static.wixstatic.com/media/${item.card.split('v1/')[1].split('/')[0]}` },
      logo: { url: `https://static.wixstatic.com/media/${item.logo.split('v1/')[1].split('/')[0]}` }
    };
  });
}

export async function getAllJobs(): Promise<Job[]> {
  const data = await fetchCmsAPI('Job');

  return data.items.map((item: any) => ({...item, companyName: item.name}));
}
