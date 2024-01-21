import crypto from 'node:crypto';
import zlib from 'node:zlib';

import { slug } from 'github-slugger';

import { NEXT_DATA_URL } from '../../next.constants.mjs';

const nextPageData = await fetch(`${NEXT_DATA_URL}/page-data`);
const nextAPIPageData = await fetch(`${NEXT_DATA_URL}/en/next-data/api-data`);

const pageData = await nextPageData.json();
const apiData = await nextAPIPageData.json();

apiData.forEach(data => {
  console.log(inflate(data.content));
});

function inflate(data) {
  return zlib.inflateSync(Buffer.from(data, 'base64')).toString('utf-8');
}

function splitIntoSections(markdownContent) {
  const lines = markdownContent.split(/\n/gm);
  const sections = [];

  let section = null;

  for (const line of lines) {
    if (line.match(/^#{1,6}\s/)) {
      section = {
        pageSectionTitle: line.replace(/^#{1,6}\s*/, ''),
        pageSectionContent: [],
      };
      sections.push(section);
    } else if (section) {
      section.pageSectionContent.push(line);
    }
  }

  return sections.map(section => ({
    ...section,
    pageSectionContent: section.pageSectionContent.join('\n'),
  }));
}

export const siteContent = pageData
  .map(data => {
    const { pathname, title, content } = data;
    const markdownContent = inflate(content);
    const siteSection = pathname.split('/').shift();
    const subSections = splitIntoSections(markdownContent);

    return subSections.map(section => {
      const id = crypto.randomUUID();
      return {
        id,
        path: pathname + '#' + slug(section.pageSectionTitle),
        siteSection,
        pageTitle: title,
        ...section,
      };
    });
  })
  .flat();
