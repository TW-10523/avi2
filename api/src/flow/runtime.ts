import { RunnableLambda } from '@langchain/core/runnables'


const nodeRegistry = new Map()

export function registerNode(name, impl) {
    nodeRegistry.set(name, impl)
}

export async function compileFlow(flow) {
    const nodeMap = new Map()
    for (const node of flow.nodes) {
        const impl = nodeRegistry.get(node.name)
        const executor = await impl.init(node.inputs)
        nodeMap.set(node.id, new RunnableLambda({ func: executor.call }))
    }

    let chain = nodeMap.get(flow.entry)
    let current = flow.entry
    while (flow.edges[current]) {
        const next = flow.edges[current]
        chain = chain.pipe(nodeMap.get(next))
        current = next
    }
    return chain
}