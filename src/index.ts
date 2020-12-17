import { assert } from 'console';
import * as fs from 'fs';
import * as parse from 'json-to-ast';

function getAstNode(filePath: string, jsonProperty: string): parse.ASTNode | undefined {
  if (!fs.existsSync(filePath)) {
    return undefined;
  }

  let fileContents: string = '';
  try {
    fileContents = fs.readFileSync(filePath, 'utf-8');
  }
  catch {
    return undefined;
  }

  let rootNode: parse.ArrayNode | undefined;
  try {
    rootNode = parse(fileContents) as parse.ArrayNode;
  }
  catch {
    return undefined;
  }

  return getAstNodeFromPropertyPart(rootNode, jsonProperty);
}

function getAstNodeFromPropertyPart(node: parse.ArrayNode, jsonProperty: string): parse.ASTNode | undefined {
  if (node.children.length === 0) {
    return node;
  }

  const jsonPropertyChunks = jsonProperty.split('.');
  if (jsonPropertyChunks.length === 0) {
    return node;
  }

  let currentProperty = jsonPropertyChunks[0];
  let isArray = false;
  let arrayElement: string | undefined;
  if (currentProperty.endsWith(']')) {
    isArray = true;
    const pos = currentProperty.indexOf('[') + 1;
    // get array element from the property name
    arrayElement = currentProperty.substr(pos, currentProperty.length - pos - 1);
    // remove array element from the property name
    currentProperty = currentProperty.substr(0, pos - 1);
  }

  for (let i = 0; i < node.children.length; i++) {
    const currentNode: parse.PropertyNode = node.children[i] as unknown as parse.PropertyNode;
    if (currentNode.type !== 'Property') {
      continue;
    }

    if (currentNode.key.value !== currentProperty) {
      continue;
    }

    // if this is the last chunk, return current node
    if (jsonPropertyChunks.length === 1) {
      if (!isArray) {
        return currentNode;
      }

      const arrayElements = (currentNode.value as parse.ArrayNode).children;
      for (let j = 0; j < arrayElements.length; j++) {
        if (arrayElements[j].type !== 'Literal') {
          continue;
        }

        if ((arrayElements[j] as parse.LiteralNode).value === arrayElement) {
          return arrayElements[j];
        }
      }

      return undefined;
    }

    // more chunks left, remove current from the array, and look for child nodes
    jsonPropertyChunks.splice(0, 1);
    return getAstNodeFromPropertyPart(currentNode.value as unknown as parse.ArrayNode, jsonPropertyChunks.join('.'));
  }

  // no matching node found
  return undefined;
}

let property;

property = 'dependencies';
const node1 = getAstNode('file.json', property);
assert(14 === node1?.loc?.start.line, `${property}\n${JSON.stringify(node1)}`);

property = 'dependencies.@microsoft/sp-core-library';
const node2 = getAstNode('file.json', property);
assert(20 === node2?.loc?.start.line, `${property}\n${JSON.stringify(node2)}`);

property = 'resolutions.@types/react';
const node3 = getAstNode('file.json', property);
assert(29 === node3?.loc?.start.line, `${property}\n${JSON.stringify(node3)}`);

property = 'keywords[sharepoint]';
const node4 = getAstNode('file.json', property);
assert(32 === node4?.loc?.start.line, `${property}\n${JSON.stringify(node4)}`);
